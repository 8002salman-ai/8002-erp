import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign, TrendingUp, TrendingDown, ShoppingCart, Package,
  Plus, FileText, AlertTriangle, ArrowUpRight, ArrowDownRight, Wallet, Users, Search, CalendarDays
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { useAuthStore, useDataStore } from '../store/useStore';
import { Card, StatCard, Badge, Button, Input, EmptyState } from '../components/ui';
import { formatCurrency, getMonthlyData } from '../utils/calculations';
import { Expense, InventoryItem, Purchase, Sale, User } from '../types';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuthStore();
  const navigate = useNavigate();
  const { sales, expenses, users, purchases, inventory } = useDataStore();
  const isAdmin = currentUser?.role === 'ADMIN';
  const [smartQuery, setSmartQuery] = useState('');

  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  const currentMonthData = useMemo(() => {
    return getMonthlyData(sales, expenses, users, currentMonth);
  }, [sales, expenses, users]);

  const lastMonthData = useMemo(() => {
    return getMonthlyData(sales, expenses, users, lastMonth);
  }, [sales, expenses, users]);

  const revenueTrend = lastMonthData.totalRevenue > 0
    ? ((currentMonthData.totalRevenue - lastMonthData.totalRevenue) / lastMonthData.totalRevenue * 100)
    : 0;

  const profitTrend = lastMonthData.finalNetProfit !== 0
    ? ((currentMonthData.finalNetProfit - lastMonthData.finalNetProfit) / Math.abs(lastMonthData.finalNetProfit) * 100)
    : 0;

  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(currentMonth, i);
      const data = getMonthlyData(sales, expenses, users, month);
      months.push({
        name: format(month, 'MMM'),
        revenue: data.totalRevenue,
        profit: data.finalNetProfit
      });
    }
    return months;
  }, [sales, expenses, users]);

  const marketplaceData = useMemo(() => {
    return Object.entries(currentMonthData.marketplaceBreakdown)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthData]);

  const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [sales]);

  const salesSummary = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const byRange = (start: Date, end: Date) => {
      const list = sales.filter(s => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start, end });
      });
      return {
        orders: list.length,
        revenue: list.reduce((sum, s) => sum + (s.saleAmount || 0), 0),
        profit: list.reduce((sum, s) => sum + (s.netProfit || 0), 0),
      };
    };

    return {
      today: byRange(todayStart, todayEnd),
      week: byRange(weekStart, weekEnd),
      month: byRange(monthStart, monthEnd),
    };
  }, [sales]);

  const smartResults = useMemo(() => {
    const q = smartQuery.trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);

    type SmartResult = {
      key: string;
      type: 'sale' | 'purchase' | 'expense' | 'inventory' | 'user';
      title: string;
      subtitle?: string;
      route: string;
      score: number;
    };

    const scoreText = (text: string) => {
      const t = (text || '').toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (!tok) continue;
        if (t === tok) score += 12;
        else if (t.startsWith(tok)) score += 8;
        else if (t.includes(tok)) score += 5;
      }
      return score;
    };

    const scoreFields = (fields: Array<string | number | undefined | null>) => {
      let s = 0;
      for (const f of fields) s += scoreText(String(f ?? ''));
      return s;
    };

    const out: SmartResult[] = [];

    const saleResults = (sales as Sale[]).map((s) => {
      const score = scoreFields([
        s.id, s.orderNumber, s.productName, s.customerName, s.customerAddress,
        s.trackingNumber, s.buyingAccount, s.marketplace
      ]);
      return score > 0 ? ({
        key: `sale:${s.id}`,
        type: 'sale' as const,
        title: `${s.productName} • ${s.orderNumber}`,
        subtitle: `${s.customerName} • ${formatCurrency(s.saleAmount)} • ${format(parseISO(s.date), 'MMM dd, yyyy')}`,
        route: '/sales',
        score
      }) : null;
    }).filter(Boolean) as SmartResult[];

    const purchaseResults = isAdmin ? (purchases as Purchase[]).map((p) => {
      const score = scoreFields([
        p.id, p.productName, p.supplier, p.invoiceNumber, p.paymentMethod, p.notes
      ]);
      return score > 0 ? ({
        key: `purchase:${p.id}`,
        type: 'purchase' as const,
        title: `${p.productName}${p.invoiceNumber ? ` • ${p.invoiceNumber}` : ''}`,
        subtitle: `${p.supplier} • ${formatCurrency(p.totalPurchaseCost)} • ${format(parseISO(p.date), 'MMM dd, yyyy')}`,
        route: '/purchases',
        score
      }) : null;
    }).filter(Boolean) as SmartResult[] : [];

    const expenseResults = isAdmin ? (expenses as Expense[]).map((e) => {
      const score = scoreFields([
        e.id, e.category, e.description, e.paymentMethod, e.notes
      ]);
      return score > 0 ? ({
        key: `expense:${e.id}`,
        type: 'expense' as const,
        title: `${e.category} • ${e.description}`,
        subtitle: `${formatCurrency(e.amount)} • ${format(parseISO(e.date), 'MMM dd, yyyy')}`,
        route: '/expenses',
        score
      }) : null;
    }).filter(Boolean) as SmartResult[] : [];

    const inventoryResults = isAdmin ? (inventory as InventoryItem[]).map((i) => {
      const score = scoreFields([
        i.id, i.sku, i.productName, i.brand, i.category, i.upc, i.asin, i.storageLocation, i.tags, i.notes
      ]);
      return score > 0 ? ({
        key: `inventory:${i.id}`,
        type: 'inventory' as const,
        title: `${i.productName}${i.sku ? ` • ${i.sku}` : ''}`,
        subtitle: `Stock: ${i.currentStock} • Cost: ${formatCurrency(i.costPerUnit)}`,
        route: '/inventory',
        score
      }) : null;
    }).filter(Boolean) as SmartResult[] : [];

    const userResults = isAdmin ? (users as User[]).map((u) => {
      const score = scoreFields([
        u.id, u.name, u.email, u.phone, u.address, u.role, u.notes
      ]);
      return score > 0 ? ({
        key: `user:${u.id}`,
        type: 'user' as const,
        title: `${u.name} • ${u.role}`,
        subtitle: u.email,
        route: '/va-management',
        score
      }) : null;
    }).filter(Boolean) as SmartResult[] : [];

    out.push(...saleResults, ...purchaseResults, ...expenseResults, ...inventoryResults, ...userResults);

    return out
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }, [smartQuery, sales, purchases, expenses, inventory, users, isAdmin]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            Welcome back, {currentUser?.name?.split(' ')[0]}!
          </h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">
            Here's what's happening this month.
          </p>
        </div>
        
        <div className="flex gap-2 flex-shrink-0">
          <Link to="/reports">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </Button>
          </Link>
          <Link to="/sales">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Sale</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Smart Search */}
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Smart Search</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search by ID, name, email, address, zip, order/invoice number, SKU and more.
            </p>
          </div>
          <div className="w-full lg:max-w-md">
            <Input
              value={smartQuery}
              onChange={(e) => setSmartQuery(e.target.value)}
              placeholder="Type anything… (e.g. order #, client name, email)"
              suffix={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {smartQuery.trim() && (
          <div className="mt-4">
            {smartResults.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {smartResults.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => navigate(r.route)}
                    className="text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white truncate">{r.title}</p>
                        {r.subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">{r.subtitle}</p>}
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex-shrink-0">
                        {r.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pt-4">
                <EmptyState
                  title="No matches"
                  description="Try a different keyword (e.g. order number, name, email, SKU)."
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Revenue"
          value={formatCurrency(currentMonthData.totalRevenue)}
          change={parseFloat(revenueTrend.toFixed(1))}
          changeLabel="vs last month"
          trend={revenueTrend >= 0 ? 'up' : 'down'}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          title="Net Profit"
          value={formatCurrency(currentMonthData.finalNetProfit)}
          change={parseFloat(profitTrend.toFixed(1))}
          trend={profitTrend >= 0 ? 'up' : 'down'}
          icon={currentMonthData.finalNetProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        />
        <StatCard
          title="Orders"
          value={currentMonthData.totalOrders.toString()}
          icon={<ShoppingCart className="w-5 h-5" />}
        />
        {isAdmin && (
          <StatCard
            title="Expenses"
            value={formatCurrency(currentMonthData.totalExpenses + currentMonthData.totalVACommission)}
            icon={<Wallet className="w-5 h-5" />}
          />
        )}
      </div>

      {/* Sales Summary (Today / Week / Month) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title={`Today Sales (${salesSummary.today.orders} orders)`}
          value={formatCurrency(salesSummary.today.revenue)}
          icon={<CalendarDays className="w-5 h-5" />}
          className="lg:col-span-1"
        />
        <StatCard
          title={`Weekly Sales (${salesSummary.week.orders} orders)`}
          value={formatCurrency(salesSummary.week.revenue)}
          icon={<CalendarDays className="w-5 h-5" />}
          className="lg:col-span-1"
        />
        <StatCard
          title={`Monthly Sales (${salesSummary.month.orders} orders)`}
          value={formatCurrency(salesSummary.month.revenue)}
          icon={<CalendarDays className="w-5 h-5" />}
          className="lg:col-span-1"
        />
      </div>

      {/* Alert */}
      {isAdmin && (currentMonthData.returnedOrders > 0 || currentMonthData.refundedOrders > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">Returns & Refunds</p>
            <p className="text-sm text-amber-700 mt-0.5">
              {currentMonthData.returnedOrders + currentMonthData.refundedOrders} orders • Loss: {formatCurrency(currentMonthData.returnLoss)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">Revenue Overview</h3>
              <p className="text-sm text-slate-500">Last 6 months</p>
            </div>
            <div className="flex items-center gap-4 text-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-slate-600">Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Profit</span>
              </div>
            </div>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2} fillOpacity={1} fill="url(#revenueGradient)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGradient)" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Marketplace Pie */}
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900">By Marketplace</h3>
            <p className="text-sm text-slate-500">This month</p>
          </div>
          <div className="h-48">
            {marketplaceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={marketplaceData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {marketplaceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No sales data
              </div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {marketplaceData.slice(0, 4).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-slate-600 truncate">{item.name}</span>
                </div>
                <span className="font-medium text-slate-900 tabular-nums flex-shrink-0 ml-2">
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <Card className="lg:col-span-2" padding="none">
          <div className="flex items-center justify-between p-4 sm:p-6 pb-0">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">Recent Sales</h3>
              <p className="text-sm text-slate-500">Latest transactions</p>
            </div>
            <Link to="/sales" className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center gap-1 flex-shrink-0">
              View all <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-4 sm:px-6 py-4">Product</th>
                    <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Customer</th>
                    <th className="px-4 sm:px-6 py-4">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate max-w-[150px] sm:max-w-none">{sale.productName}</p>
                          <p className="text-xs text-slate-500">{format(parseISO(sale.date), 'MMM dd')}</p>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">
                        <span className="truncate block max-w-[120px]">{sale.customerName}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <Badge
                          variant={
                            sale.deliveryStatus === 'delivered' ? 'success' :
                            sale.deliveryStatus === 'shipped' ? 'info' :
                            sale.deliveryStatus === 'returned' || sale.deliveryStatus === 'refunded' ? 'danger' :
                            'warning'
                          }
                          dot
                          size="sm"
                        >
                          {sale.deliveryStatus}
                        </Badge>
                      </td>
                      <td className={`px-4 sm:px-6 py-4 text-sm font-bold text-right tabular-nums whitespace-nowrap ${
                        sale.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        <span className="inline-flex items-center gap-1">
                          {sale.netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {formatCurrency(Math.abs(sale.netProfit))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p className="text-slate-500 mb-4">No sales yet</p>
              <Link to="/sales">
                <Button size="sm">
                  <Plus className="w-4 h-4" />
                  Add first sale
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/sales" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-red-50 group transition-all">
              <div className="p-2 rounded-lg bg-red-100 text-red-600 group-hover:scale-110 transition-transform flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-slate-900">Add Sale</p>
                <p className="text-sm text-slate-500">Record a new sale</p>
              </div>
            </Link>
            
            {isAdmin && (
              <>
                <Link to="/purchases" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-orange-50 group transition-all">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">Add Purchase</p>
                    <p className="text-sm text-slate-500">Record inventory</p>
                  </div>
                </Link>
                
                <Link to="/expenses" className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-purple-50 group transition-all">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform flex-shrink-0">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">Add Expense</p>
                    <p className="text-sm text-slate-500">Track expenses</p>
                  </div>
                </Link>
              </>
            )}
          </div>

          {/* VA Commissions */}
          {isAdmin && currentMonthData.vaCommissions.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-slate-900">VA Commissions</h4>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-3">
                {currentMonthData.vaCommissions.map((va, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                        {va.name.charAt(0)}
                      </div>
                      <span className="text-sm text-slate-600 truncate">{va.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-purple-600 tabular-nums flex-shrink-0 ml-2">
                      {formatCurrency(va.commission)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
