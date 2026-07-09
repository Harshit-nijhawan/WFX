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
  const { text, limit = 12, threshold = 0.1 } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Text query parameter is required.' });
  }

  try {
    // Generate text embedding using local CLIP model
    const embedding = await embeddingService.getTextEmbedding(text);

    // Call pgvector match function on Supabase
    const { data: results, error } = await supabase.rpc('match_finished_goods', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ results: results || [] });
  } catch (error: any) {
    console.error('Semantic text search error:', error.message);
    return res.status(500).json({ error: 'Internal server error during semantic search.' });
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
    const limit = parseInt(req.body.limit) || 12;
    const threshold = parseFloat(req.body.threshold) || 0.1;

    // Generate CLIP image embedding directly from the file buffer
    const embedding = await embeddingService.getImageEmbedding(req.file.buffer);

    // Run similarity match against the database
    const { data: results, error } = await supabase.rpc('match_finished_goods', {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({ results: results || [] });
  } catch (error: any) {
    console.error('Image similarity search error:', error.message);
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
