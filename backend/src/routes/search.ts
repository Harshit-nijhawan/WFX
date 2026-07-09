import { Router, Response } from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase';
import { embeddingService } from '../services/embedding';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Setup Multer memory storage for uploaded garment images
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

/**
 * Endpoint to perform semantic text-to-image/style searches
 * POST /api/search/text
 */
router.post('/text', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { text } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text query parameter is required.' });
  }

  // --- Try semantic (vector) search first ---
  try {
    const embedding = await embeddingService.getTextEmbedding(text);

    // Call pgvector match function on Supabase
    // We retrieve all candidates up to 1000 to perform re-ranking on the server
    const { data: results, error } = await supabase.rpc('match_finished_goods', {
      query_embedding: embedding,
      match_threshold: 0.01, // Fetch broad matches for the re-ranking pipeline
      match_count: 1000
    });

    if (error) {
      throw error;
    }

    const queryLower = text.toLowerCase();
    const colors = ['black', 'white', 'blue', 'grey', 'gray', 'charcoal', 'navy', 'green', 'red', 'yellow', 'pink', 'orange', 'purple', 'off white', 'off-white'];
    const categories = ['shirt', 't-shirt', 'jean', 'jacket', 'skirt', 'short', 'trouser', 'pant'];

    const matchedColorsInQuery = colors.filter(c => queryLower.includes(c));
    const matchedCategoriesInQuery = categories.filter(c => queryLower.includes(c));

    // Re-rank candidates based on exact query keyword matches
    const reRanked = (results || []).map((item: any) => {
      let score = item.similarity;
      const itemColor = (item.color || '').toLowerCase();
      const itemCategory = (item.category || '').toLowerCase();
      const itemName = (item.style_name || '').toLowerCase();

      // 1. Color matching & enforcement
      if (matchedColorsInQuery.length > 0) {
        const matchesColor = matchedColorsInQuery.some(c => itemColor.includes(c) || itemName.includes(c));
        if (matchesColor) {
          score += 0.08; // Boost for color match
        } else {
          score -= 0.15; // Penalty for mismatching color
        }
      }

      // 2. Category matching & enforcement
      if (matchedCategoriesInQuery.length > 0) {
        const matchesCategory = matchedCategoriesInQuery.some(c => itemCategory.includes(c) || itemName.includes(c));
        if (matchesCategory) {
          score += 0.08; // Boost for category match
        } else {
          score -= 0.15; // Penalty for mismatching category
        }
      }

      return { ...item, similarity: Math.max(0, Math.min(1, score)) };
    });

    // Apply optional structured filters
    let filteredResults = reRanked;
    const { category, fabric, brand, supplier, color: filterColor, season, gsmMin, gsmMax } = req.body;

    if (category) {
      filteredResults = filteredResults.filter((item: any) => (item.category || '').toLowerCase() === category.toLowerCase());
    }
    if (fabric) {
      filteredResults = filteredResults.filter((item: any) => (item.fabric || '').toLowerCase() === fabric.toLowerCase());
    }
    if (brand) {
      filteredResults = filteredResults.filter((item: any) => (item.brand || '').toLowerCase() === brand.toLowerCase());
    }
    if (supplier) {
      filteredResults = filteredResults.filter((item: any) => (item.supplier || '').toLowerCase() === supplier.toLowerCase());
    }
    if (filterColor) {
      filteredResults = filteredResults.filter((item: any) => (item.color || '').toLowerCase().includes(filterColor.toLowerCase()));
    }
    if (season) {
      filteredResults = filteredResults.filter((item: any) => (item.season || '').toLowerCase() === season.toLowerCase());
    }
    if (gsmMin !== undefined && gsmMin !== null && gsmMin !== '') {
      filteredResults = filteredResults.filter((item: any) => Number(item.gsm) >= Number(gsmMin));
    }
    if (gsmMax !== undefined && gsmMax !== null && gsmMax !== '') {
      filteredResults = filteredResults.filter((item: any) => Number(item.gsm) <= Number(gsmMax));
    }

    // Filter by fixed similarity threshold of 0.80, and sort descending
    const finalResults = filteredResults
      .filter((item: any) => item.similarity >= 0.80)
      .sort((a: any, b: any) => b.similarity - a.similarity);

    return res.status(200).json({ results: finalResults, searchMode: 'semantic' });

  } catch (embeddingError: any) {
    // --- Fallback: keyword search if embedding API is unavailable ---
    console.warn('[Search] Embedding API unavailable, using keyword fallback:', embeddingError.message);

    try {
      const words = text.toLowerCase().split(/\s+/).filter(Boolean);
      let query = supabase.from('finished_goods').select('*').limit(50);

      for (const word of words.slice(0, 3)) {
        query = query.or(
          `style_name.ilike.%${word}%,color.ilike.%${word}%,category.ilike.%${word}%,fabric.ilike.%${word}%,brand.ilike.%${word}%`
        );
      }

      const { data: keywordResults, error: kwErr } = await query;
      if (kwErr) throw kwErr;

      let finalKeywordResults = keywordResults || [];
      const { category, fabric, brand, supplier, color: filterColor, season, gsmMin, gsmMax } = req.body;

      if (category) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.category || '').toLowerCase() === category.toLowerCase());
      }
      if (fabric) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.fabric || '').toLowerCase() === fabric.toLowerCase());
      }
      if (brand) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.brand || '').toLowerCase() === brand.toLowerCase());
      }
      if (supplier) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.supplier || '').toLowerCase() === supplier.toLowerCase());
      }
      if (filterColor) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.color || '').toLowerCase().includes(filterColor.toLowerCase()));
      }
      if (season) {
        finalKeywordResults = finalKeywordResults.filter((item: any) => (item.season || '').toLowerCase() === season.toLowerCase());
      }
      if (gsmMin !== undefined && gsmMin !== null && gsmMin !== '') {
        finalKeywordResults = finalKeywordResults.filter((item: any) => Number(item.gsm) >= Number(gsmMin));
      }
      if (gsmMax !== undefined && gsmMax !== null && gsmMax !== '') {
        finalKeywordResults = finalKeywordResults.filter((item: any) => Number(item.gsm) <= Number(gsmMax));
      }

      const results = finalKeywordResults.map((item: any) => ({ ...item, similarity: 0.85 }));
      return res.status(200).json({ results, searchMode: 'keyword' });

    } catch (fallbackError: any) {
      console.error('[Search] Keyword fallback also failed:', fallbackError.message);
      return res.status(500).json({ error: 'Search is temporarily unavailable. Please try again.' });
    }
  }
});

/**
 * Endpoint to perform image-to-image similarity searches
 * POST /api/search/image
 */
router.post('/image', authenticateJWT, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Image file upload is required.' });
  }

  try {
    // Generate CLIP image embedding directly from the file buffer
    const embedding = await embeddingService.getImageEmbedding(req.file.buffer);

    // Run similarity match against the database with a fixed background threshold of 0.70
    const { data: results, error } = await supabase.rpc('match_finished_goods', {
      query_embedding: embedding,
      match_threshold: 0.70,
      match_count: 1000
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ results: results || [] });
  } catch (error: any) {
    console.error('Image similarity search error:', error.message);
    if (error.message && error.message.includes('HUGGINGFACE_TOKEN')) {
      return res.status(400).json({ error: 'Image search requires a HUGGINGFACE_TOKEN configured on the server. Please add it to your environment variables.' });
    }
    return res.status(500).json({ error: 'Internal server error during image search.' });
  }
});

/**
 * Endpoint to populate embeddings for finished goods (index building)
 * POST /api/search/index
 */
router.post('/index', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all finished goods that don't have embeddings yet
    const { data: unindexedGoods, error } = await supabase
      .from('finished_goods')
      .select('style_number, style_name, category, fabric, color, print, season, brand, supplier')
      .not('style_number', 'in', (
        supabase.from('finished_goods_embeddings').select('style_number')
      ));

    if (error) {
      // Fallback: If subquery isn't supported easily by standard JS SDK parsing, get all styles and do a manual diff
      const { data: allGoods, error: allErr } = await supabase.from('finished_goods').select('*');
      const { data: existingEmbeddings, error: extErr } = await supabase.from('finished_goods_embeddings').select('style_number');

      if (allErr || extErr) {
        throw allErr || extErr;
      }

      const existingSet = new Set((existingEmbeddings || []).map(e => e.style_number));
      const filteredGoods = (allGoods || []).filter(g => !existingSet.has(g.style_number));
      
      return await indexGoodsList(filteredGoods, res);
    }

    return await indexGoodsList(unindexedGoods || [], res);
  } catch (error: any) {
    console.error('Vector indexing error:', error.message);
    return res.status(500).json({ error: 'Internal server error during vector indexing.' });
  }
});

async function indexGoodsList(goodsList: any[], res: Response) {
  if (goodsList.length === 0) {
    return res.status(200).json({ message: 'All finished goods are already indexed.', count: 0 });
  }

  console.log(`Indexing ${goodsList.length} items...`);
  let successCount = 0;
  let failCount = 0;

  // Index in chunks of 20 to avoid memory overflow or rate limiting
  const chunkSize = 20;
  for (let i = 0; i < goodsList.length; i += chunkSize) {
    const chunk = goodsList.slice(i, i + chunkSize);
    const insertPromises = chunk.map(async (item) => {
      try {
        // Construct detailed description text string for CLIP encoding
        const descriptionText = `${item.brand || ''} ${item.style_name || ''}, ${item.color || ''} ${item.print || ''}, ${item.fabric || ''} ${item.category || ''} supplied by ${item.supplier || ''} for ${item.season || ''}`.trim().replace(/\s+/g, ' ');

        // Generate embedding vector
        const embedding = await embeddingService.getTextEmbedding(descriptionText);

        // Save to DB
        const { error } = await supabase
          .from('finished_goods_embeddings')
          .upsert({
            style_number: item.style_number,
            embedding: embedding
          });

        if (error) throw error;
        successCount++;
      } catch (err: any) {
        console.error(`Failed to index style ${item.style_number}:`, err.message);
        failCount++;
      }
    });

    await Promise.all(insertPromises);
  }

  return res.status(200).json({
    message: `Indexing completed.`,
    total: goodsList.length,
    success: successCount,
    failed: failCount
  });
}

export default router;
