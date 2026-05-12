import React, { useState, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Plus, Search, Download, Edit2, Trash2, FileText, Copy, Upload, Sparkles,
  ChevronLeft, ChevronRight, Filter, ArrowUpRight, ArrowDownRight, X, Eye
} from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { usePermissions } from '../hooks/usePermissions';
import { Sale, MARKETPLACES, DELIVERY_STATUSES } from '../types';
import { Button, Card, Badge, Modal, Input, Select, Textarea, ConfirmDialog, Toast, EmptyState } from '../components/ui';
import { formatCurrency, calculateSaleProfit } from '../utils/calculations';
import { generateSaleInvoice } from '../utils/pdf';
import { extractAutofillFromDocument } from '../utils/aiDocumentAutofill';

const DEFAULT_SALE: Partial<Sale> = {
  date: new Date().toISOString().split('T')[0],
  deliveryDate: '',
  productName: '',
  orderNumber: '',
  customerName: '',
  customerAddress: '',
  trackingNumber: '',
  buyingAccount: 'Salman',
  marketplace: 'eBay',
  deliveryStatus: 'pending',
  quantity: 1,
  productCost: 0,
  stockItemPrice: 0,
  saleAmount: 0,
  marketplaceFee: 0,
  salesTax: 0,
  shippingCost: 0,
  thirdPlCost: 0,
  otherExpenses: 0,
  notes: ''
};

type FieldFillSource = 'ai' | 'manual';
type SaleFieldSources = Partial<Record<keyof Sale, FieldFillSource>>;

const Sales: React.FC = () => {
  const { sales, users, settings, inventory, addSale, updateSale, deleteSale } = useDataStore();
  const { can } = usePermissions();
  
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [formData, setFormData] = useState<Partial<Sale>>(DEFAULT_SALE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [fieldSources, setFieldSources] = useState<SaleFieldSources>({});
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMarketplace, setFilterMarketplace] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  
  // Buying accounts (from VAs + default)
  const buyingAccounts = useMemo(() => {
    const vas = users.filter(u => u.role === 'VA' && u.status === 'active').map(u => u.name);
    return ['Salman', ...vas, 'Other'];
  }, [users]);
  
  // Filtered and sorted sales
  const filteredSales = useMemo(() => {
    return sales
      .filter(sale => {
        const matchesSearch = 
          sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          sale.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMarketplace = !filterMarketplace || sale.marketplace === filterMarketplace;
        const matchesStatus = !filterStatus || sale.deliveryStatus === filterStatus;
        return matchesSearch && matchesMarketplace && matchesStatus;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, searchTerm, filterMarketplace, filterStatus]);
  
  const totalPages = Math.ceil(filteredSales.length / perPage);
  const paginatedSales = filteredSales.slice((page - 1) * perPage, page * perPage);
  
  // Stats
  const stats = useMemo(() => ({
    total: filteredSales.length,
    revenue: filteredSales.reduce((s, sale) => s + sale.saleAmount, 0),
    profit: filteredSales.reduce((s, sale) => s + sale.netProfit, 0)
  }), [filteredSales]);
  
  // Live profit calculation
  const liveProfit = useMemo(() => {
    return calculateSaleProfit(formData);
  }, [formData]);

  // "Earn" = revenue after fees/taxes/shipping (not including product costs)
  const earnInfo = useMemo(() => {
    const saleAmount = formData.saleAmount || 0;
    const feeTotal =
      (formData.marketplaceFee || 0) +
      (formData.salesTax || 0) +
      (formData.shippingCost || 0) +
      (formData.thirdPlCost || 0) +
      (formData.otherExpenses || 0);
    const earnAmount = saleAmount - feeTotal;
    const label = feeTotal > 0 ? 'Earn (after fees)' : 'Earn';
    return { earnAmount, label };
  }, [
    formData.saleAmount,
    formData.marketplaceFee,
    formData.salesTax,
    formData.shippingCost,
    formData.thirdPlCost,
    formData.otherExpenses
  ]);
  
  const handleOpenModal = (sale?: Sale) => {
    if (sale) {
      setEditingSale(sale);
      setFormData({ ...sale, date: sale.date.split('T')[0] });
      const existingSources: SaleFieldSources = {};
      (Object.entries(sale) as Array<[keyof Sale, unknown]>).forEach(([key, value]) => {
        if (typeof value === 'string' && value.trim()) existingSources[key] = 'manual';
        if (typeof value === 'number' && value !== 0) existingSources[key] = 'manual';
      });
      setFieldSources(existingSources);
    } else {
      setEditingSale(null);
      setFormData({ ...DEFAULT_SALE, date: new Date().toISOString().split('T')[0] });
      setFieldSources({});
    }
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSale(null);
    setFormData(DEFAULT_SALE);
    setFieldSources({});
  };
  
  const handleChange = (field: keyof Sale, value: string | number) => {
    setFieldSources((prev) => ({ ...prev, [field]: 'manual' }));
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'deliveryStatus') {
        const status = String(value);
        if (status === 'delivered') {
          if (!next.deliveryDate) next.deliveryDate = new Date().toISOString().split('T')[0];
        }
      }
      return next;
    });
  };

  const getFieldClassName = (field: keyof Sale) => {
    const source = fieldSources[field];
    if (source === 'ai') {
      return '!text-blue-700 dark:!text-blue-300 !border-blue-300 dark:!border-blue-700';
    }
    if (source === 'manual') {
      return '!text-emerald-700 dark:!text-emerald-300 !border-emerald-300 dark:!border-emerald-700';
    }
    return '!text-slate-400 dark:!text-slate-500';
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName || !formData.orderNumber || !formData.customerName) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    if (formData.deliveryStatus === 'delivered' && !formData.deliveryDate) {
      setToast({ message: 'Please select Delivery Date', type: 'error' });
      return;
    }
    
    try {
      if (editingSale) {
        updateSale(editingSale.id, formData);
        setToast({ message: 'Sale updated successfully', type: 'success' });
      } else {
        addSale(formData as Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'netProfit' | 'grossProfit' | 'profitMargin'>);
        setToast({ message: 'Sale added successfully', type: 'success' });
      }
      handleCloseModal();
    } catch {
      setToast({ message: 'An error occurred', type: 'error' });
    }
  };

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAiAutofilling(true);
      const extracted = await extractAutofillFromDocument(file, 'sales');
      setFormData((prev) => ({
        ...prev,
        ...extracted,
      }));
      setFieldSources((prev) => {
        const next = { ...prev };
        (Object.keys(extracted) as Array<keyof Sale>).forEach((key) => {
          const value = extracted[key];
          if (value !== null && value !== undefined && value !== '') {
            next[key] = 'ai';
          }
        });
        return next;
      });
      setToast({ message: 'AI autofill applied. Please review remaining fields.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot process this file, please enter data manually.';
      setToast({ message, type: 'error' });
    } finally {
      setIsAiAutofilling(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };
  
  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };
  
  const confirmDelete = () => {
    if (deleteId) {
      deleteSale(deleteId);
      setToast({ message: 'Sale deleted successfully', type: 'success' });
      setDeleteId(null);
    }
  };
  
  const handleDownloadInvoice = (sale: Sale) => {
    generateSaleInvoice(sale, settings);
    setToast({ message: 'Invoice downloaded', type: 'success' });
  };
  
  const handleDuplicate = (sale: Sale) => {
    setEditingSale(null);
    setFormData({
      ...sale,
      id: undefined,
      date: new Date().toISOString().split('T')[0],
      orderNumber: '',
      trackingNumber: ''
    });
    setShowModal(true);
  };

  const handleView = (sale: Sale) => {
    setViewingSale(sale);
  };

  const closeView = () => {
    setViewingSale(null);
  };

  const copySaleDetails = async (sale: Sale) => {
    const lines = [
      `Sale Details`,
      `────────────`,
      `Date: ${format(parseISO(sale.date), 'yyyy-MM-dd')}`,
      sale.deliveryDate ? `Delivery Date: ${format(parseISO(sale.deliveryDate), 'yyyy-MM-dd')}` : null,
      `Order #: ${sale.orderNumber}`,
      `Product: ${sale.productName}`,
      `Customer: ${sale.customerName}`,
      sale.customerAddress ? `Address: ${sale.customerAddress}` : null,
      sale.trackingNumber ? `Tracking: ${sale.trackingNumber}` : null,
      `Marketplace: ${sale.marketplace}`,
      `Status: ${sale.deliveryStatus}`,
      `Qty: ${sale.quantity}`,
      ``,
      `Financial`,
      `────────`,
      `Sale Amount: ${formatCurrency(sale.saleAmount)}`,
      `Marketplace Fee: ${formatCurrency(sale.marketplaceFee || 0)}`,
      `Sales Tax: ${formatCurrency(sale.salesTax || 0)}`,
      `Shipping Cost: ${formatCurrency(sale.shippingCost || 0)}`,
      `3PL Cost: ${formatCurrency(sale.thirdPlCost || 0)}`,
      `Other Expenses: ${formatCurrency(sale.otherExpenses || 0)}`,
      `Product Cost (COG): ${formatCurrency(sale.productCost || 0)}`,
      `Stock Item Price: ${formatCurrency(sale.stockItemPrice || 0)}`,
      ``,
      `Gross Profit: ${formatCurrency(sale.grossProfit)}`,
      `Net Profit: ${formatCurrency(sale.netProfit)}`,
      `Margin: ${Number(sale.profitMargin || 0).toFixed(1)}%`,
      sale.notes ? `` : null,
      sale.notes ? `Notes: ${sale.notes}` : null,
    ].filter(Boolean).join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      setToast({ message: 'Sale details copied', type: 'success' });
    } catch {
      const ta = document.createElement('textarea');
      ta.value = lines;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setToast({ message: 'Sale details copied', type: 'success' });
    }
  };
  
  const exportCSV = () => {
    const headers = ['Date', 'Product', 'Order No', 'Customer', 'Marketplace', 'Status', 'Qty', 'COG', 'Stock Item Price', 'Sale', 'Marketplace Fee', 'Sales Tax', 'Shipping', '3PL Cost', 'Other', 'Net Profit'];
    const rows = filteredSales.map(s => [
      format(parseISO(s.date), 'yyyy-MM-dd'),
      `"${s.productName}"`,
      s.orderNumber,
      `"${s.customerName}"`,
      s.marketplace,
      s.deliveryStatus,
      s.quantity,
      s.productCost,
      s.stockItemPrice || 0,
      s.saleAmount,
      s.marketplaceFee,
      s.salesTax || 0,
      s.shippingCost,
      s.thirdPlCost || 0,
      s.otherExpenses,
      s.netProfit
    ]);
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'CSV exported successfully', type: 'success' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterMarketplace('');
    setFilterStatus('');
    setPage(1);
  };

  const hasActiveFilters = searchTerm || filterMarketplace || filterStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sales</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            <span className="tabular-nums">{stats.total}</span> sales • 
            <span className="ml-1 tabular-nums">{formatCurrency(stats.revenue)}</span> revenue • 
            <span className={`ml-1 tabular-nums ${stats.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(stats.profit)} profit
            </span>
          </p>
        </div>
        
        <div className="flex gap-2">
          {can('sales_export') && (
            <Button variant="outline" onClick={exportCSV} size="sm">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          {can('sales_add') && (
            <Button onClick={() => handleOpenModal()} size="sm">
              <Plus className="w-4 h-4" />
              Add Sale
            </Button>
          )}
        </div>
      </div>
      
      {/* Search & Filters */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products, customers, orders..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 border rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                hasActiveFilters 
                  ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center">
                  {[searchTerm, filterMarketplace, filterStatus].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>
        
        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
            <select
              value={filterMarketplace}
              onChange={(e) => { setFilterMarketplace(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="">All Marketplaces</option>
              {MARKETPLACES.map(mp => (
                <option key={mp} value={mp}>{mp}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="">All Statuses</option>
              {DELIVERY_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </Card>
      
      {/* Sales Table */}
      <Card padding="none">
        {paginatedSales.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Marketplace</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-right">Profit</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {format(parseISO(sale.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                          {sale.productName}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          #{sale.orderNumber.slice(0, 12)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">
                      {sale.customerName}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="default">{sale.marketplace}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        variant={
                          sale.deliveryStatus === 'delivered' ? 'success' :
                          sale.deliveryStatus === 'shipped' ? 'info' :
                          sale.deliveryStatus === 'returned' || sale.deliveryStatus === 'refunded' ? 'danger' :
                          'warning'
                        }
                        dot
                      >
                        {sale.deliveryStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900 dark:text-white text-right font-semibold tabular-nums">
                      {formatCurrency(sale.saleAmount)}
                    </td>
                    <td className={`px-4 py-4 text-sm text-right font-bold tabular-nums`}>
                      <span className={`inline-flex items-center gap-1 ${
                        sale.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {sale.netProfit >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {formatCurrency(Math.abs(sale.netProfit))}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {can('sales_view') && (
                          <button
                            onClick={() => handleView(sale)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {can('sales_edit') && (
                          <button
                            onClick={() => handleOpenModal(sale)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('sales_invoice') && (
                          <button
                            onClick={() => handleDownloadInvoice(sale)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Download Invoice"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {can('sales_add') && (
                          <button
                            onClick={() => handleDuplicate(sale)}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        )}
                        {can('sales_delete') && (
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<FileText className="w-10 h-10" />}
            title="No sales found"
            description={hasActiveFilters ? "Try adjusting your filters" : "Start by adding your first sale"}
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button onClick={() => handleOpenModal()}>
                  <Plus className="w-4 h-4" />
                  Add Sale
                </Button>
              )
            }
          />
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-700 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filteredSales.length)} of {filteredSales.length}
              </span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-red-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingSale ? 'Edit Sale' : 'Add New Sale'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Autofill from Invoice Image/PDF
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Upload file and we will fill relevant fields automatically. If it fails, you can enter manually.
                </p>
              </div>
              <div>
                <input
                  ref={aiFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleAiFileUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={isAiAutofilling}
                >
                  <Upload className="w-4 h-4" />
                  {isAiAutofilling ? 'Reading...' : 'Upload for AI'}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                AI filled
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Manual filled
              </span>
              <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                Remaining
              </span>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={formData.date?.split('T')[0] || ''}
              onChange={(e) => handleChange('date', e.target.value)}
              className={getFieldClassName('date')}
              required
            />
            <Input
              label="Product Name"
              value={formData.productName || ''}
              onChange={(e) => handleChange('productName', e.target.value)}
              placeholder="Enter product name"
              className={getFieldClassName('productName')}
              required
            />
            <Input
              label="Order Number"
              value={formData.orderNumber || ''}
              onChange={(e) => handleChange('orderNumber', e.target.value)}
              placeholder="Enter order number"
              className={getFieldClassName('orderNumber')}
              required
            />
            <Input
              label="Customer Name"
              value={formData.customerName || ''}
              onChange={(e) => handleChange('customerName', e.target.value)}
              placeholder="Enter customer name"
              className={getFieldClassName('customerName')}
              required
            />
          </div>
          
          <Textarea
            label="Customer Address"
            value={formData.customerAddress || ''}
            onChange={(e) => handleChange('customerAddress', e.target.value)}
            placeholder="Enter customer address"
            className={getFieldClassName('customerAddress')}
            rows={2}
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Tracking Number"
              value={formData.trackingNumber || ''}
              onChange={(e) => handleChange('trackingNumber', e.target.value)}
              placeholder="Tracking #"
              className={getFieldClassName('trackingNumber')}
            />
            <Select
              label="Buying Account"
              value={formData.buyingAccount || 'Salman'}
              onChange={(e) => handleChange('buyingAccount', e.target.value)}
              options={buyingAccounts.map(a => ({ value: a, label: a }))}
              className={getFieldClassName('buyingAccount')}
            />
            <Select
              label="Marketplace"
              value={formData.marketplace || 'eBay'}
              onChange={(e) => handleChange('marketplace', e.target.value)}
              options={MARKETPLACES.map(m => ({ value: m, label: m }))}
              className={getFieldClassName('marketplace')}
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Delivery Status"
              value={formData.deliveryStatus || 'pending'}
              onChange={(e) => handleChange('deliveryStatus', e.target.value)}
              options={DELIVERY_STATUSES.map(s => ({ value: s.value, label: s.label }))}
              className={getFieldClassName('deliveryStatus')}
            />
            {formData.deliveryStatus === 'delivered' ? (
              <Input
                label="Delivery Date"
                type="date"
                value={(formData.deliveryDate || '').split('T')[0]}
                onChange={(e) => handleChange('deliveryDate', e.target.value)}
                hint="Select when order was delivered"
                className={getFieldClassName('deliveryDate')}
                required
              />
            ) : (
            <Input
              label="Quantity"
              type="number"
              min={1}
              value={formData.quantity || 1}
              onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
              className={getFieldClassName('quantity')}
            />
            )}
            <Select
              label="Link Inventory Item"
              value={formData.inventoryItemId || ''}
              onChange={(e) => {
                const itemId = e.target.value;
                handleChange('inventoryItemId', itemId);
                // Auto-fill stock item price from inventory cost
                if (itemId) {
                  const invItem = inventory.find(i => i.id === itemId);
                  if (invItem) {
                    handleChange('stockItemPrice', invItem.costPerUnit);
                  }
                } else {
                  handleChange('stockItemPrice', 0);
                }
              }}
              options={[
                { value: '', label: '— None (not from stock) —' },
                ...inventory.map(i => ({
                  value: i.id,
                  label: `${i.productName} (${i.currentStock} in stock)`
                }))
              ]}
              className={getFieldClassName('inventoryItemId')}
            />
          </div>
          {formData.inventoryItemId && (() => {
            const linked = inventory.find(i => i.id === formData.inventoryItemId);
            if (!linked) return null;
            return (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-blue-700 dark:text-blue-300 font-medium">📦 {linked.productName}</span>
                  <span className="text-blue-600 dark:text-blue-400 ml-2">
                    Stock: <strong>{linked.currentStock}</strong> → After sale: <strong>{Math.max(0, linked.currentStock - (formData.quantity || 1))}</strong>
                  </span>
                </div>
                <span className="text-xs text-blue-500">Auto-deducts on save</span>
              </div>
            );
          })()}
          
          {/* Financial Details */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Financial Details</h3>
            
            {/* Row 1: Cost & Sale */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <Input
                label="Product Cost (COG)"
                type="number"
                step="0.01"
                min={0}
                value={formData.productCost || ''}
                onChange={(e) => handleChange('productCost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="Buying price from supplier"
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('productCost')}
              />
              <Input
                label="Stock Item Price"
                type="number"
                step="0.01"
                min={0}
                value={formData.stockItemPrice || ''}
                onChange={(e) => handleChange('stockItemPrice', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="If sent from your own stock"
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('stockItemPrice')}
              />
              <Input
                label="Sale Amount"
                type="number"
                step="0.01"
                min={0}
                value={formData.saleAmount || ''}
                onChange={(e) => handleChange('saleAmount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint={`Customer paid this amount • ${earnInfo.label}: ${formatCurrency(earnInfo.earnAmount)}`}
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('saleAmount')}
              />
            </div>

            {/* Row 2: Fees & Taxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <Input
                label="Marketplace Fee"
                type="number"
                step="0.01"
                min={0}
                value={formData.marketplaceFee || ''}
                onChange={(e) => handleChange('marketplaceFee', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="eBay, Etsy fee etc."
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('marketplaceFee')}
              />
              <Input
                label="Sales Tax"
                type="number"
                step="0.01"
                min={0}
                value={formData.salesTax || ''}
                onChange={(e) => handleChange('salesTax', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="Tax collected/paid"
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('salesTax')}
              />
              <Input
                label="Shipping Cost"
                type="number"
                step="0.01"
                min={0}
                value={formData.shippingCost || ''}
                onChange={(e) => handleChange('shippingCost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="USPS, UPS, FedEx etc."
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('shippingCost')}
              />
            </div>

            {/* Row 3: 3PL & Other */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input
                label="3PL Cost"
                type="number"
                step="0.01"
                min={0}
                value={formData.thirdPlCost || ''}
                onChange={(e) => handleChange('thirdPlCost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="3rd party fulfillment"
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('thirdPlCost')}
              />
              <Input
                label="Other Expenses"
                type="number"
                step="0.01"
                min={0}
                value={formData.otherExpenses || ''}
                onChange={(e) => handleChange('otherExpenses', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                hint="Any other costs"
                suffix={<span className="text-slate-400">$</span>}
                className={getFieldClassName('otherExpenses')}
              />
            </div>
          </div>
          
          {/* Live Profit Display */}
          <div className={`p-5 rounded-xl ${
            liveProfit.netProfit >= 0 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Gross Profit</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(liveProfit.grossProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Net Profit</p>
                <p className={`text-2xl font-bold tabular-nums ${
                  liveProfit.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {liveProfit.netProfit >= 0 ? '+' : ''}{formatCurrency(liveProfit.netProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Margin</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                  {liveProfit.profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
            {liveProfit.netProfit < 0 && (
              <p className="text-center text-red-600 dark:text-red-400 text-sm mt-3 font-medium flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Warning: This order results in a loss
              </p>
            )}
          </div>
          
          <Textarea
            label="Notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Additional notes..."
            className={getFieldClassName('notes')}
            rows={2}
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSale ? 'Update Sale' : 'Save Sale'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Sale (Read-only) */}
      <Modal
        isOpen={!!viewingSale}
        onClose={closeView}
        title={viewingSale ? `Sale • ${viewingSale.orderNumber}` : 'Sale'}
        size="lg"
      >
        {viewingSale && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-500 dark:text-slate-400">Customer</p>
                <p className="font-semibold text-slate-900 dark:text-white truncate">{viewingSale.customerName}</p>
                {viewingSale.customerAddress && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{viewingSale.customerAddress}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" onClick={() => copySaleDetails(viewingSale)}>
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                {can('sales_invoice') && (
                  <Button variant="outline" onClick={() => handleDownloadInvoice(viewingSale)}>
                    <FileText className="w-4 h-4" />
                    Invoice
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{format(parseISO(viewingSale.date), 'MMM dd, yyyy')}</p>
                {viewingSale.deliveryDate && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Delivered: {format(parseISO(viewingSale.deliveryDate), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Marketplace</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">{viewingSale.marketplace}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</p>
                <div className="mt-1">
                  <Badge
                    variant={
                      viewingSale.deliveryStatus === 'delivered' ? 'success' :
                      viewingSale.deliveryStatus === 'shipped' ? 'info' :
                      viewingSale.deliveryStatus === 'returned' || viewingSale.deliveryStatus === 'refunded' ? 'danger' :
                      'warning'
                    }
                    dot
                  >
                    {viewingSale.deliveryStatus}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Order</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Order #</p>
                  <p className="font-mono text-slate-900 dark:text-white break-all">{viewingSale.orderNumber}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Tracking</p>
                  <p className="font-mono text-slate-900 dark:text-white break-all">{viewingSale.trackingNumber || '—'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-slate-500 dark:text-slate-400">Product</p>
                  <p className="font-semibold text-slate-900 dark:text-white">{viewingSale.productName}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Financial</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Sale Amount</p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatCurrency(viewingSale.saleAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Marketplace Fee</p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatCurrency(viewingSale.marketplaceFee || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Shipping</p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatCurrency(viewingSale.shippingCost || 0)}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Gross Profit</p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{formatCurrency(viewingSale.grossProfit)}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Net Profit</p>
                  <p className={`font-bold tabular-nums ${viewingSale.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {viewingSale.netProfit >= 0 ? '+' : ''}{formatCurrency(viewingSale.netProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Margin</p>
                  <p className="font-semibold text-slate-900 dark:text-white tabular-nums">{Number(viewingSale.profitMargin || 0).toFixed(1)}%</p>
                </div>
              </div>
            </div>

            {viewingSale.notes && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewingSale.notes}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={closeView}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
      
      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default Sales;
