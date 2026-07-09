import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Box, Users, ShoppingCart, DollarSign, Loader2, Award } from 'lucide-react';

interface DashboardStats {
  summary: {
    totalFinishedGoods: number;
    totalSuppliers: number;
    totalBuyers: number;
    totalOrders: number;
    totalRevenue: number;
  };
  charts: {
    monthlyRevenue: Array<{ month: string; revenue: number }>;
    topBuyers: Array<{ name: string; value: number }>;
    orderStatus: Array<{ name: string; value: number }>;
    supplierRatings: Array<{ name: string; rating: number }>;
  };
}

export const Dashboard: React.FC = () => {
  const { token, apiUrl } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to retrieve dashboard metrics.');
        }

        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, apiUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading aggregate ERP metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-500/20 rounded-2xl text-center max-w-lg mx-auto mt-20">
        <h3 className="text-lg font-bold text-red-400">Error Loading Dashboard</h3>
        <p className="text-sm text-slate-400 mt-2">{error || 'Unable to connect to service.'}</p>
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatCompact = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(1)} L`;
    } else if (val >= 1000) {
      return `₹${(val / 1000).toFixed(0)} K`;
    }
    return `₹${val}`;
  };

  const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const kpis = [
    { label: 'Finished Goods', value: stats.summary.totalFinishedGoods, icon: Box, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Total Suppliers', value: stats.summary.totalSuppliers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Buyers', value: stats.summary.totalBuyers, icon: Award, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Sales Orders', value: stats.summary.totalOrders, icon: ShoppingCart, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Revenue', value: formatCurrency(stats.summary.totalRevenue), icon: DollarSign, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time apparel sourcing and aggregate ERP analytics</p>
      </div>

      {/* KPI Counters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.02] hover:border-white/10 transition-all duration-300 shadow-lg shadow-black/20">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color} transition-all duration-300 group-hover:scale-110`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="z-10">
                <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue Area Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Revenue Trends</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Monthly aggregate sales order value</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.charts.monthlyRevenue} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0a0b12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#c084fc' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Buyers Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Top Buyers</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Purchasing value by buyer company</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.topBuyers} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0b12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  labelStyle={{ color: '#white', fontWeight: 'bold' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Spend']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {stats.charts.topBuyers.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Ratings Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Supplier Ratings</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Top suppliers sorted by quality rating</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.supplierRatings} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 5]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0b12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  formatter={(value: any) => [value, 'Rating']}
                />
                <Bar dataKey="rating" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {stats.charts.supplierRatings.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Order Statuses</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Order count distribution by status</span>
          </div>
          <div className="h-80 w-full flex items-center justify-center">
            <div className="w-[60%] h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.charts.orderStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.charts.orderStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0a0b12', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
