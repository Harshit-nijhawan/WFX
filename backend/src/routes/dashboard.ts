import { Router, Response } from 'express';
import { supabase } from '../config/supabase';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 1. Get exact counts via Supabase headers (lightweight and native)
    const { count: finishedGoodsCount, error: fgErr } = await supabase.from('finished_goods').select('*', { count: 'exact', head: true });
    const { count: suppliersCount, error: supErr } = await supabase.from('suppliers').select('*', { count: 'exact', head: true });
    const { count: buyersCount, error: buyErr } = await supabase.from('buyers').select('*', { count: 'exact', head: true });
    const { count: ordersCount, error: ordErr } = await supabase.from('sales_orders').select('*', { count: 'exact', head: true });

    if (fgErr || supErr || buyErr || ordErr) {
      console.error('Supabase count error:', { fgErr, supErr, buyErr, ordErr });
    }

    // 2. Fetch total invoice revenue and aggregates for charts via exec_sql RPC
    // We fetch aggregates in parallel using the safe sql exec function we designed.
    const revenueQuery = `SELECT SUM(amount) as total_revenue FROM public.sales_invoices`;
    const monthlyRevenueQuery = `
      SELECT SUBSTRING(shipment_date FROM 1 FOR 7) as month, SUM(quantity * unit_price) as revenue
      FROM public.sales_orders
      WHERE shipment_date IS NOT NULL AND shipment_date <> ''
      GROUP BY SUBSTRING(shipment_date FROM 1 FOR 7)
      ORDER BY month ASC
      LIMIT 12
    `;
    const topBuyersQuery = `
      SELECT buyer as name, SUM(quantity * unit_price) as value
      FROM public.sales_orders
      GROUP BY buyer
      ORDER BY value DESC
      LIMIT 5
    `;
    const orderStatusQuery = `
      SELECT status as name, COUNT(*) as value
      FROM public.sales_orders
      GROUP BY status
    `;
    const supplierRatingsQuery = `
      SELECT company_name as name, rating
      FROM public.suppliers
      ORDER BY rating DESC
      LIMIT 5
    `;

    const [
      { data: revenueData },
      { data: monthlyRevenue },
      { data: topBuyers },
      { data: orderStatus },
      { data: supplierRatings }
    ] = await Promise.all([
      supabase.rpc('exec_sql', { sql_query: revenueQuery }),
      supabase.rpc('exec_sql', { sql_query: monthlyRevenueQuery }),
      supabase.rpc('exec_sql', { sql_query: topBuyersQuery }),
      supabase.rpc('exec_sql', { sql_query: orderStatusQuery }),
      supabase.rpc('exec_sql', { sql_query: supplierRatingsQuery })
    ]);

    const totalRevenue = revenueData && revenueData[0] ? Number(revenueData[0].total_revenue) || 0 : 0;

    return res.status(200).json({
      summary: {
        totalFinishedGoods: finishedGoodsCount || 0,
        totalSuppliers: suppliersCount || 0,
        totalBuyers: buyersCount || 0,
        totalOrders: ordersCount || 0,
        totalRevenue: totalRevenue
      },
      charts: {
        monthlyRevenue: Array.isArray(monthlyRevenue) ? monthlyRevenue : [],
        topBuyers: Array.isArray(topBuyers) ? topBuyers : [],
        orderStatus: Array.isArray(orderStatus) ? orderStatus : [],
        supplierRatings: Array.isArray(supplierRatings) ? supplierRatings : []
      }
    });
  } catch (error: any) {
    console.error('Dashboard stats fetch error:', error.message);
    return res.status(500).json({ error: 'Internal server error while fetching dashboard statistics.' });
  }
});

export default router;
