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
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-500 animate-spin" />
        <p className="text-sm text-slate-450">Loading aggregate ERP metrics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-lg text-center max-w-lg mx-auto mt-20 shadow-sm">
        <h3 className="text-lg font-bold text-red-650 dark:text-red-400">Error Loading Dashboard</h3>
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

  // Modern corporate colors
  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#64748b', '#ef4444'];

  const kpis = [
    { label: 'Finished Goods', value: stats.summary.totalFinishedGoods, icon: Box, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Total Suppliers', value: stats.summary.totalSuppliers, icon: Users, color: 'text-slate-650 dark:text-slate-450', bg: 'bg-slate-500/10' },
    { label: 'Total Buyers', value: stats.summary.totalBuyers, icon: Award, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Sales Orders', value: stats.summary.totalOrders, icon: ShoppingCart, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Total Revenue', value: formatCurrency(stats.summary.totalRevenue), icon: DollarSign, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
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
            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg flex flex-col justify-between h-32 relative overflow-hidden group shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`p-2 rounded-lg ${kpi.bg} ${kpi.color} transition-all duration-200`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="z-10">
                <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue Area Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Revenue Trends</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Monthly aggregate sales order value</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.charts.monthlyRevenue} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Buyers Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Top Buyers</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Purchasing value by buyer company</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.topBuyers} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={formatCompact} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Supplier Ratings</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Top suppliers sorted by quality rating</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.charts.supplierRatings} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={[0, 5]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  formatter={(value: any) => [value, 'Rating']}
                />
                <Bar dataKey="rating" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {stats.charts.supplierRatings.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Pie Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-lg shadow-sm space-y-4">
          <div className="flex flex-col">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Order Statuses</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Order count distribution by status</span>
          </div>
          <div className="h-80 w-full flex items-center justify-center">
            <div className="w-[65%] h-full">
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
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
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
