import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const sortBy = (req.query.sort_by as string) || (req.query.sortBy as string) || 'style_number';
    const sortOrder = (req.query.sort_order as string) === 'desc' || (req.query.sortOrder as string) === 'desc' ? 'desc' : 'asc';

    // Filters
    const category = req.query.category as string;
    const fabric = req.query.fabric as string;
    const gsmMin = parseInt(req.query.gsm_min as string) || parseInt(req.query.gsmMin as string);
    const gsmMax = parseInt(req.query.gsm_max as string) || parseInt(req.query.gsmMax as string);
    const color = req.query.color as string;
    const season = req.query.season as string;
    const brand = req.query.brand as string;
    const supplier = req.query.supplier as string;

    const offset = (page - 1) * limit;

    let query = supabase
      .from('finished_goods')
      .select('*', { count: 'exact' });

    // Apply filters if present
    if (category) query = query.eq('category', category);
    if (fabric) query = query.eq('fabric', fabric);
    if (!isNaN(gsmMin)) query = query.gte('gsm', gsmMin);
    if (!isNaN(gsmMax)) query = query.lte('gsm', gsmMax);
    if (color) query = query.ilike('color', `%${color}%`);
    if (season) query = query.eq('season', season);
    if (brand) query = query.eq('brand', brand);
    if (supplier) query = query.eq('supplier', supplier);

    // Apply sorting & pagination
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      products: data || [],
      total: totalItems,
      page,
      limit,
      totalPages: totalPages,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        limit
      }
    });
  } catch (error: any) {
    console.error('Products fetch error:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching products.' });
  }
});

// Fetch unique filter values for dropdown selectors
router.get('/filters', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sidebarOptionsQuery = `
      SELECT 
        ARRAY(SELECT DISTINCT category FROM public.finished_goods WHERE category IS NOT NULL ORDER BY category) as categories,
        ARRAY(SELECT DISTINCT fabric FROM public.finished_goods WHERE fabric IS NOT NULL ORDER BY fabric) as fabrics,
        ARRAY(SELECT DISTINCT color FROM public.finished_goods WHERE color IS NOT NULL ORDER BY color) as colors,
        ARRAY(SELECT DISTINCT season FROM public.finished_goods WHERE season IS NOT NULL ORDER BY season) as seasons,
        ARRAY(SELECT DISTINCT brand FROM public.finished_goods WHERE brand IS NOT NULL ORDER BY brand) as brands,
        ARRAY(SELECT DISTINCT supplier FROM public.finished_goods WHERE supplier IS NOT NULL ORDER BY supplier) as suppliers
    `;
    const { data: filterOptions, error: filterErr } = await supabase.rpc('exec_sql', { sql_query: sidebarOptionsQuery });

    if (filterErr) {
      throw filterErr;
    }

    return res.status(200).json(filterOptions && filterOptions[0] ? filterOptions[0] : {
      categories: [],
      fabrics: [],
      colors: [],
      seasons: [],
      brands: [],
      suppliers: []
    });
  } catch (error: any) {
    console.error('Fetch filter options error:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching filter options.' });
  }
});

// Fetch product details along with tech pack details
router.get('/:style_number/details', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  const { style_number } = req.params;
  try {
    const { data: product, error: prodErr } = await supabase
      .from('finished_goods')
      .select('*')
      .eq('style_number', style_number)
      .maybeSingle();

    if (prodErr || !product) {
      return res.status(404).json({ error: 'Product style not found.' });
    }

    const { data: techPack, error: tpErr } = await supabase
      .from('tech_packs')
      .select('*')
      .eq('style_number', style_number)
      .maybeSingle();

    return res.status(200).json({
      product,
      techPack: techPack || null
    });
  } catch (error: any) {
    console.error('Product details fetch error:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching product details.' });
  }
});

export default router;
