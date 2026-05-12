import React, { useState, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Plus, Search, Edit2, Trash2, Package, AlertTriangle, ArrowDown, ArrowUp,
  ChevronLeft, ChevronRight, History, RefreshCw, ExternalLink, Tag, Upload, Sparkles
} from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { usePermissions } from '../hooks/usePermissions';
import { InventoryItem } from '../types';
import { Button, Card, Badge, Modal, Input, Select, Textarea, ConfirmDialog, Toast, EmptyState, StatCard } from '../components/ui';
import { formatCurrency } from '../utils/calculations';
import { extractAutofillFromDocument } from '../utils/aiDocumentAutofill';

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'refurbished', label: 'Refurbished' },
  { value: 'open_box', label: 'Open Box' },
];

const DEFAULT_ITEM: Partial<InventoryItem> = {
  sku: '', productName: '', category: '', brand: '', supplier: '', supplierLink: '',
  condition: 'new', color: '', size: '', weight: '', dimensions: '',
  upc: '', asin: '', storageLocation: '', costPerUnit: 0,
  currentStock: 0, lowStockThreshold: 5, tags: '', notes: ''
};

const Inventory: React.FC = () => {
  const { inventory, stockMovements, addInventoryItem, updateInventoryItem, deleteInventoryItem, addStockMovement } = useDataStore();
  const { can } = usePermissions();

  const [showModal, setShowModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>(DEFAULT_ITEM);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'add' | 'remove'>('add');
  const [adjustNote, setAdjustNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => ({
    totalProducts: inventory.length,
    totalStock: inventory.reduce((s, i) => s + i.currentStock, 0),
    totalValue: inventory.reduce((s, i) => s + i.currentStock * i.costPerUnit, 0),
    lowStock: inventory.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold).length,
    outOfStock: inventory.filter(i => i.currentStock === 0).length
  }), [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory
      .filter(i => {
        const matchSearch =
          i.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (i.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (i.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (i.tags || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus =
          !filterStatus ||
          (filterStatus === 'in_stock' && i.currentStock > i.lowStockThreshold) ||
          (filterStatus === 'low' && i.currentStock > 0 && i.currentStock <= i.lowStockThreshold) ||
          (filterStatus === 'out' && i.currentStock === 0);
        return matchSearch && matchStatus;
      })
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [inventory, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filteredInventory.length / perPage);
  const paginatedInventory = filteredInventory.slice((page - 1) * perPage, page * perPage);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) { setEditingItem(item); setFormData({ ...item }); }
    else { setEditingItem(null); setFormData({ ...DEFAULT_ITEM }); }
    setShowModal(true);
  };
  const handleCloseModal = () => { setShowModal(false); setEditingItem(null); };
  const handleChange = (field: keyof InventoryItem, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.sku) {
      setToast({ message: 'Product name and SKU are required', type: 'error' }); return;
    }
    if (editingItem) {
      updateInventoryItem(editingItem.id, formData);
      setToast({ message: 'Product updated', type: 'success' });
    } else {
      addInventoryItem(formData as Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'totalBought' | 'totalSold'>);
      setToast({ message: 'Product added to inventory', type: 'success' });
    }
    handleCloseModal();
  };

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAiAutofilling(true);
      const extracted = await extractAutofillFromDocument(file, 'inventory');
      setFormData((prev) => ({
        ...prev,
        ...extracted,
      }));
      setToast({ message: 'AI autofill applied. Please review remaining fields.', type: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cannot process this file, please enter data manually.';
      setToast({ message, type: 'error' });
    } finally {
      setIsAiAutofilling(false);
      if (aiFileInputRef.current) aiFileInputRef.current.value = '';
    }
  };

  const openAdjust = (id: string) => {
    setSelectedItemId(id); setAdjustQty(0); setAdjustType('add'); setAdjustNote(''); setShowAdjustModal(true);
  };
  const handleAdjust = () => {
    if (!selectedItemId || adjustQty <= 0) { setToast({ message: 'Enter a valid quantity', type: 'error' }); return; }
    addStockMovement({
      inventoryItemId: selectedItemId, type: 'adjustment',
      quantity: adjustType === 'add' ? adjustQty : -adjustQty,
      notes: adjustNote || (adjustType === 'add' ? 'Manual stock addition' : 'Manual stock removal'),
      date: new Date().toISOString()
    });
    setToast({ message: `Stock ${adjustType === 'add' ? 'added' : 'removed'}`, type: 'success' });
    setShowAdjustModal(false);
  };

  const openHistory = (id: string) => { setSelectedItemId(id); setShowHistoryModal(true); };
  const openDetail = (id: string) => { setSelectedItemId(id); setShowDetailModal(true); };

  const selectedItemMovements = useMemo(() => {
    if (!selectedItemId) return [];
    return stockMovements.filter(m => m.inventoryItemId === selectedItemId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedItemId, stockMovements]);

  const confirmDelete = () => {
    if (deleteId) { deleteInventoryItem(deleteId); setToast({ message: 'Product removed', type: 'success' }); setDeleteId(null); }
  };

  const getStockBadge = (item: InventoryItem) => {
    if (item.currentStock === 0) return <Badge variant="danger" dot>Out of Stock</Badge>;
    if (item.currentStock <= item.lowStockThreshold) return <Badge variant="warning" dot>Low Stock</Badge>;
    return <Badge variant="success" dot>In Stock</Badge>;
  };

  const selectedItem = selectedItemId ? inventory.find(i => i.id === selectedItemId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{stats.totalProducts} products • {stats.totalStock} units in stock</p>
        </div>
        {can('inventory_add') && (
          <Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4" /> Add Product</Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Products" value={stats.totalProducts.toString()} icon={<Package className="w-5 h-5" />} />
        <StatCard title="Total Units" value={stats.totalStock.toString()} icon={<Package className="w-5 h-5" />} />
        <StatCard title="Stock Value" value={formatCurrency(stats.totalValue)} icon={<Tag className="w-5 h-5" />} />
        <Card padding="sm" hover>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Low Stock</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.lowStock}</p>
        </Card>
        <Card padding="sm" hover>
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Out of Stock</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.outOfStock}</p>
        </Card>
      </div>

      {stats.lowStock > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{stats.lowStock} product(s) low on stock</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
              {inventory.filter(i => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold).map(i => i.productName).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search name, SKU, brand, category, tags..."
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" />
          </div>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm">
            <option value="">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="none">
        {paginatedInventory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">SKU</th>
                  <th className="px-4 py-3.5">Brand</th>
                  <th className="px-4 py-3.5">Condition</th>
                  <th className="px-4 py-3.5 text-right">Cost</th>
                  <th className="px-4 py-3.5 text-right">Stock</th>
                  <th className="px-4 py-3.5 text-right">Sold</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedInventory.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => openDetail(item.id)}>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{item.productName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.category || '-'} {item.storageLocation ? `• ${item.storageLocation}` : ''}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">{item.sku}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{item.brand || '-'}</td>
                    <td className="px-4 py-4"><Badge variant="default" size="sm">{item.condition}</Badge></td>
                    <td className="px-4 py-4 text-sm text-slate-900 dark:text-white text-right tabular-nums">{formatCurrency(item.costPerUnit)}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={`text-sm font-bold tabular-nums ${item.currentStock === 0 ? 'text-red-600' : item.currentStock <= item.lowStockThreshold ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                        {item.currentStock}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-blue-600 dark:text-blue-400 text-right tabular-nums">{item.totalSold}</td>
                    <td className="px-4 py-4">{getStockBadge(item)}</td>
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {can('inventory_add') && (
                          <button onClick={() => openAdjust(item.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Adjust Stock">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => openHistory(item.id)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="History">
                          <History className="w-4 h-4" />
                        </button>
                        {can('inventory_edit') && (
                          <button onClick={() => handleOpenModal(item)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('inventory_edit') && (
                          <button onClick={() => { setDeleteId(item.id); setShowDeleteConfirm(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
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
          <EmptyState icon={<Package className="w-10 h-10" />} title="No inventory items"
            description="Add products to track stock" action={can('inventory_add') ? <Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4" />Add Product</Button> : undefined} />
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* ====== ADD/EDIT PRODUCT MODAL ====== */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingItem ? 'Edit Product' : 'Add Product to Inventory'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Autofill from Product Bill/Invoice
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Upload image/PDF and auto-fill available inventory details. Rest you can enter manually.
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
          </div>

          {/* Basic Info */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Basic Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Product Name *" value={formData.productName || ''} onChange={e => handleChange('productName', e.target.value)} placeholder="e.g. iPhone 15 Case" required />
              <Input label="SKU *" value={formData.sku || ''} onChange={e => handleChange('sku', e.target.value)} placeholder="e.g. IP15-CASE-BLK" required />
              <Input label="Brand" value={formData.brand || ''} onChange={e => handleChange('brand', e.target.value)} placeholder="e.g. Apple, Samsung" />
              <Input label="Category" value={formData.category || ''} onChange={e => handleChange('category', e.target.value)} placeholder="e.g. Phone Accessories" />
              <Select label="Condition" value={formData.condition || 'new'} onChange={e => handleChange('condition', e.target.value)} options={CONDITIONS} />
              <Input label="Tags" value={formData.tags || ''} onChange={e => handleChange('tags', e.target.value)} placeholder="e.g. phone, case, black" hint="Comma separated" />
            </div>
          </div>

          {/* Supplier & Source */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Supplier & Source</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Supplier" value={formData.supplier || ''} onChange={e => handleChange('supplier', e.target.value)} placeholder="e.g. AliExpress, Alibaba" />
              <Input label="Supplier Link" value={formData.supplierLink || ''} onChange={e => handleChange('supplierLink', e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Product Details */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Product Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label="Color" value={formData.color || ''} onChange={e => handleChange('color', e.target.value)} placeholder="e.g. Black" />
              <Input label="Size" value={formData.size || ''} onChange={e => handleChange('size', e.target.value)} placeholder="e.g. Large, 10x5" />
              <Input label="Weight" value={formData.weight || ''} onChange={e => handleChange('weight', e.target.value)} placeholder="e.g. 0.5 lbs" />
              <Input label="Dimensions" value={formData.dimensions || ''} onChange={e => handleChange('dimensions', e.target.value)} placeholder="e.g. 10x5x3 in" />
            </div>
          </div>

          {/* Identifiers */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Identifiers & Location</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="UPC / Barcode" value={formData.upc || ''} onChange={e => handleChange('upc', e.target.value)} placeholder="e.g. 012345678901" />
              <Input label="ASIN (Amazon)" value={formData.asin || ''} onChange={e => handleChange('asin', e.target.value)} placeholder="e.g. B0XXXXXXXX" />
              <Input label="Storage Location" value={formData.storageLocation || ''} onChange={e => handleChange('storageLocation', e.target.value)} placeholder="e.g. Shelf A3, Box 12" />
            </div>
          </div>

          {/* Stock & Cost */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Stock & Cost</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label="Cost Per Unit ($)" type="number" step="0.01" min={0} value={formData.costPerUnit || ''} onChange={e => handleChange('costPerUnit', parseFloat(e.target.value) || 0)} placeholder="0.00" suffix={<span className="text-slate-400">$</span>} hint="Your buying price" />
              <Input label={editingItem ? "Current Stock" : "Initial Stock"} type="number" min={0} value={formData.currentStock || 0} onChange={e => handleChange('currentStock', parseInt(e.target.value) || 0)} hint="Units in hand" />
              <Input label="Low Stock Alert" type="number" min={0} value={formData.lowStockThreshold || 5} onChange={e => handleChange('lowStockThreshold', parseInt(e.target.value) || 5)} hint="Alert below this" />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Stock Value</label>
                <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-bold tabular-nums">
                  {formatCurrency((formData.currentStock || 0) * (formData.costPerUnit || 0))}
                </div>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Auto calculated</p>
              </div>
            </div>
          </div>

          <Textarea label="Notes" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={2} placeholder="Any additional notes..." />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit">{editingItem ? 'Update' : 'Add'} Product</Button>
          </div>
        </form>
      </Modal>

      {/* ====== PRODUCT DETAIL MODAL ====== */}
      <Modal isOpen={showDetailModal} onClose={() => setShowDetailModal(false)} title={selectedItem?.productName || 'Product Details'} size="lg">
        {selectedItem && (
          <div className="space-y-6">
            {/* Status & Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Stock</p>
                <p className={`text-3xl font-bold tabular-nums ${selectedItem.currentStock === 0 ? 'text-red-600' : selectedItem.currentStock <= selectedItem.lowStockThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedItem.currentStock}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Bought</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{selectedItem.totalBought}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Sold</p>
                <p className="text-3xl font-bold text-blue-600 tabular-nums">{selectedItem.totalSold}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {[
                ['SKU', selectedItem.sku],
                ['Brand', selectedItem.brand],
                ['Category', selectedItem.category],
                ['Condition', selectedItem.condition],
                ['Color', selectedItem.color],
                ['Size', selectedItem.size],
                ['Weight', selectedItem.weight],
                ['Dimensions', selectedItem.dimensions],
                ['UPC / Barcode', selectedItem.upc],
                ['ASIN', selectedItem.asin],
                ['Storage', selectedItem.storageLocation],
                ['Cost/Unit', formatCurrency(selectedItem.costPerUnit)],
                ['Supplier', selectedItem.supplier],
                ['Low Stock Alert', `${selectedItem.lowStockThreshold} units`],
                ['Stock Value', formatCurrency(selectedItem.currentStock * selectedItem.costPerUnit)],
                ['Tags', selectedItem.tags],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400">{label}</span>
                  <span className="font-medium text-slate-900 dark:text-white text-right">{value || '-'}</span>
                </div>
              ))}
            </div>

            {selectedItem.supplierLink && (
              <a href={selectedItem.supplierLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                <ExternalLink className="w-4 h-4" /> Open Supplier Link
              </a>
            )}

            {selectedItem.notes && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{selectedItem.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              {can('inventory_add') && <Button variant="success" size="sm" onClick={() => { setShowDetailModal(false); openAdjust(selectedItem.id); }}><RefreshCw className="w-4 h-4" /> Adjust Stock</Button>}
              <Button variant="outline" size="sm" onClick={() => { setShowDetailModal(false); openHistory(selectedItem.id); }}><History className="w-4 h-4" /> View History</Button>
              {can('inventory_edit') && <Button variant="secondary" size="sm" onClick={() => { setShowDetailModal(false); handleOpenModal(selectedItem); }}><Edit2 className="w-4 h-4" /> Edit</Button>}
            </div>
          </div>
        )}
      </Modal>

      {/* ====== ADJUST STOCK MODAL ====== */}
      <Modal isOpen={showAdjustModal} onClose={() => setShowAdjustModal(false)} title={`Adjust Stock — ${selectedItem?.productName || ''}`} size="sm">
        <div className="space-y-5">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Current Stock</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedItem?.currentStock || 0}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdjustType('add')} className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${adjustType === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              <ArrowDown className="w-4 h-4" /> Add Stock
            </button>
            <button onClick={() => setAdjustType('remove')} className={`flex-1 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${adjustType === 'remove' ? 'bg-red-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
              <ArrowUp className="w-4 h-4" /> Remove Stock
            </button>
          </div>
          <Input label="Quantity" type="number" min={1} value={adjustQty || ''} onChange={e => setAdjustQty(parseInt(e.target.value) || 0)} placeholder="Enter quantity" />
          <Input label="Reason / Note" value={adjustNote} onChange={e => setAdjustNote(e.target.value)} placeholder="e.g. Received from supplier" />
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">New Stock Level</p>
            <p className="text-2xl font-bold text-blue-600">{Math.max(0, (selectedItem?.currentStock || 0) + (adjustType === 'add' ? adjustQty : -adjustQty))}</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
            <Button variant={adjustType === 'add' ? 'success' : 'danger'} onClick={handleAdjust}>{adjustType === 'add' ? 'Add' : 'Remove'} {adjustQty} units</Button>
          </div>
        </div>
      </Modal>

      {/* ====== STOCK HISTORY MODAL ====== */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title={`Stock History — ${selectedItem?.productName || ''}`} size="lg">
        {selectedItemMovements.length > 0 ? (
          <div className="space-y-3">
            {selectedItemMovements.map(mov => (
              <div key={mov.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${mov.quantity > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                    {mov.quantity > 0 ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{mov.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{mov.notes || '-'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className={`text-sm font-bold tabular-nums ${mov.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{mov.quantity > 0 ? '+' : ''}{mov.quantity}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{format(parseISO(mov.createdAt), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<History className="w-10 h-10" />} title="No history" description="No stock movements recorded yet" />
        )}
      </Modal>

      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete}
        title="Delete Product" message="This will remove the product and all its stock history." confirmText="Delete" variant="danger" />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Inventory;
