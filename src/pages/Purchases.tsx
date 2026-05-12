import React, { useState, useMemo, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Search, Edit2, Trash2, Package, ChevronLeft, ChevronRight, Upload, FileText, X, Download, Eye, Sparkles } from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { usePermissions } from '../hooks/usePermissions';
import { Purchase, PAYMENT_METHODS, DocumentFile } from '../types';
import { Button, Card, Badge, Modal, Input, Select, Textarea, ConfirmDialog, Toast, EmptyState } from '../components/ui';
import { formatCurrency } from '../utils/calculations';
import { v4 as uuidv4 } from 'uuid';
import { extractAutofillFromDocument } from '../utils/aiDocumentAutofill';

const DEFAULT_PURCHASE: Partial<Purchase> = {
  date: new Date().toISOString().split('T')[0],
  productName: '',
  supplier: '',
  invoiceNumber: '',
  quantity: 1,
  unitCost: 0,
  totalCost: 0,
  shippingCost: 0,
  importFees: 0,
  otherCharges: 0,
  paymentMethod: 'Credit Card',
  paymentStatus: 'paid',
  documents: [],
  notes: ''
};

const Purchases: React.FC = () => {
  const { purchases, addPurchase, updatePurchase, deletePurchase } = useDataStore();
  const { can } = usePermissions();
  
  const [showModal, setShowModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState<Partial<Purchase>>(DEFAULT_PURCHASE);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showDocViewer, setShowDocViewer] = useState<DocumentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiFileInputRef = useRef<HTMLInputElement>(null);
  const perPage = 25;
  
  const filteredPurchases = useMemo(() => {
    return purchases
      .filter(p => 
        p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, searchTerm]);
  
  const totalPages = Math.ceil(filteredPurchases.length / perPage);
  const paginatedPurchases = filteredPurchases.slice((page - 1) * perPage, page * perPage);
  
  const totalStats = useMemo(() => ({
    totalPurchases: purchases.length,
    totalAmount: purchases.reduce((s, p) => s + p.totalPurchaseCost, 0),
    totalUnits: purchases.reduce((s, p) => s + p.quantity, 0)
  }), [purchases]);
  
  const liveTotals = useMemo(() => {
    const totalCost = (formData.quantity || 1) * (formData.unitCost || 0);
    const totalPurchaseCost = totalCost + (formData.shippingCost || 0) + (formData.importFees || 0) + (formData.otherCharges || 0);
    const costPerUnit = formData.quantity && formData.quantity > 0 ? totalPurchaseCost / formData.quantity : 0;
    return { totalCost, totalPurchaseCost, costPerUnit };
  }, [formData]);
  
  const handleOpenModal = (purchase?: Purchase) => {
    if (purchase) {
      setEditingPurchase(purchase);
      setFormData({ ...purchase, date: purchase.date.split('T')[0] });
      setDocuments(purchase.documents || []);
    } else {
      setEditingPurchase(null);
      setFormData({ ...DEFAULT_PURCHASE, date: new Date().toISOString().split('T')[0] });
      setDocuments([]);
    }
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPurchase(null);
    setFormData(DEFAULT_PURCHASE);
    setDocuments([]);
  };
  
  const handleChange = (field: keyof Purchase, value: string | number) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'quantity' || field === 'unitCost') {
        updated.totalCost = (Number(updated.quantity) || 1) * (Number(updated.unitCost) || 0);
      }
      return updated;
    });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const maxSize = 5 * 1024 * 1024;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (file.size > maxSize) {
        setToast({ message: `${file.name} is too large (max 5MB)`, type: 'error' });
        continue;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newDoc: DocumentFile = {
          id: uuidv4(),
          name: file.name,
          type: file.type,
          data: base64,
          uploadedAt: new Date().toISOString()
        };
        setDocuments(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAiAutofilling(true);
      const extracted = await extractAutofillFromDocument(file, 'purchases');
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
  
  const downloadDocument = (doc: DocumentFile) => {
    const link = document.createElement('a');
    link.href = doc.data;
    link.download = doc.name;
    link.click();
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.productName || !formData.supplier) {
      setToast({ message: 'Please fill in required fields', type: 'error' });
      return;
    }
    
    const data = { ...formData, totalCost: liveTotals.totalCost, documents };
    
    if (editingPurchase) {
      updatePurchase(editingPurchase.id, data);
      setToast({ message: 'Purchase updated', type: 'success' });
    } else {
      addPurchase(data as Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchaseCost' | 'costPerUnit'>);
      setToast({ message: 'Purchase added', type: 'success' });
    }
    handleCloseModal();
  };
  
  const confirmDelete = () => {
    if (deleteId) {
      deletePurchase(deleteId);
      setToast({ message: 'Purchase deleted', type: 'success' });
      setDeleteId(null);
    }
  };
  
  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('spreadsheet') || type.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Purchases</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            <span className="tabular-nums">{totalStats.totalPurchases}</span> purchases • 
            <span className="ml-1 tabular-nums">{totalStats.totalUnits}</span> units • 
            <span className="ml-1 tabular-nums">{formatCurrency(totalStats.totalAmount)}</span> total
          </p>
        </div>
        {can('purchases_add') && (
          <Button onClick={() => handleOpenModal()}>
            <Plus className="w-4 h-4" />
            Add Purchase
          </Button>
        )}
      </div>
      
      <Card padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product or supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>
      </Card>
      
      <Card padding="none">
        {paginatedPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Product</th>
                  <th className="px-4 py-3.5">Supplier</th>
                  <th className="px-4 py-3.5 text-right">Qty</th>
                  <th className="px-4 py-3.5 text-right">Unit Cost</th>
                  <th className="px-4 py-3.5 text-right">Total</th>
                  <th className="px-4 py-3.5">Docs</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {format(parseISO(purchase.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{purchase.productName}</p>
                      {purchase.invoiceNumber && (
                        <p className="text-xs text-slate-400 font-mono">#{purchase.invoiceNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">{purchase.supplier}</td>
                    <td className="px-4 py-4 text-sm text-slate-900 dark:text-white text-right tabular-nums">{purchase.quantity}</td>
                    <td className="px-4 py-4 text-sm text-slate-600 text-right tabular-nums">{formatCurrency(purchase.costPerUnit)}</td>
                    <td className="px-4 py-4 text-sm text-slate-900 dark:text-white text-right font-bold tabular-nums">{formatCurrency(purchase.totalPurchaseCost)}</td>
                    <td className="px-4 py-4">
                      {purchase.documents && purchase.documents.length > 0 ? (
                        <Badge variant="info">{purchase.documents.length} files</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={purchase.paymentStatus === 'paid' ? 'success' : purchase.paymentStatus === 'pending' ? 'warning' : 'info'} dot>
                        {purchase.paymentStatus}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {can('purchases_edit') && (
                          <button onClick={() => handleOpenModal(purchase)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {can('purchases_delete') && (
                          <button onClick={() => { setDeleteId(purchase.id); setShowDeleteConfirm(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
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
            icon={<Package className="w-10 h-10" />}
            title="No purchases found"
            description="Start by adding your first purchase"
            action={<Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4" />Add Purchase</Button>}
          />
        )}
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingPurchase ? 'Edit Purchase' : 'Add Purchase'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={formData.date?.split('T')[0] || ''} onChange={(e) => handleChange('date', e.target.value)} required />
            <Input label="Product Name" value={formData.productName || ''} onChange={(e) => handleChange('productName', e.target.value)} required />
            <Input label="Supplier" value={formData.supplier || ''} onChange={(e) => handleChange('supplier', e.target.value)} required />
            <Input label="Invoice Number" value={formData.invoiceNumber || ''} onChange={(e) => handleChange('invoiceNumber', e.target.value)} />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Input label="Quantity" type="number" min={1} value={formData.quantity || 1} onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)} required />
            <Input label="Unit Cost" type="number" step="0.01" min={0} value={formData.unitCost || ''} onChange={(e) => handleChange('unitCost', parseFloat(e.target.value) || 0)} suffix={<span className="text-slate-400">$</span>} required />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Total Cost</label>
              <div className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-900 dark:text-white font-bold tabular-nums">
                {formatCurrency(liveTotals.totalCost)}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <Input label="Shipping" type="number" step="0.01" min={0} value={formData.shippingCost || ''} onChange={(e) => handleChange('shippingCost', parseFloat(e.target.value) || 0)} suffix={<span className="text-slate-400">$</span>} />
            <Input label="Import Fees" type="number" step="0.01" min={0} value={formData.importFees || ''} onChange={(e) => handleChange('importFees', parseFloat(e.target.value) || 0)} suffix={<span className="text-slate-400">$</span>} />
            <Input label="Other" type="number" step="0.01" min={0} value={formData.otherCharges || ''} onChange={(e) => handleChange('otherCharges', parseFloat(e.target.value) || 0)} suffix={<span className="text-slate-400">$</span>} />
          </div>
          
          <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Purchase Cost</p>
                <p className="text-2xl font-bold text-blue-600 tabular-nums">{formatCurrency(liveTotals.totalPurchaseCost)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Cost Per Unit</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(liveTotals.costPerUnit)}</p>
              </div>
            </div>
          </div>
          
          {/* Document Upload */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents & Invoices
            </h3>
            
            <div className="mb-4">
              <input ref={fileInputRef} type="file" onChange={handleFileUpload} multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden" />
              <input ref={aiFileInputRef} type="file" onChange={handleAiFileUpload} accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" />
              <div className="mb-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Autofill
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Upload image/PDF to auto-fill buying fields. If AI fails, enter data manually.
                </p>
                <div className="mt-2">
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
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Upload Documents
              </Button>
              <p className="text-xs text-slate-500 mt-2">PDF, Images, Word, Excel (max 5MB each)</p>
            </div>
            
            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFileIcon(doc.type)}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{doc.name}</p>
                        <p className="text-xs text-slate-500">{format(parseISO(doc.uploadedAt), 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(doc.type.includes('image') || doc.type.includes('pdf')) && (
                        <button type="button" onClick={() => setShowDocViewer(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button type="button" onClick={() => downloadDocument(doc)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg">
                        <Download className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => removeDocument(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Method" value={formData.paymentMethod || 'Credit Card'} onChange={(e) => handleChange('paymentMethod', e.target.value)} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
            <Select label="Status" value={formData.paymentStatus || 'paid'} onChange={(e) => handleChange('paymentStatus', e.target.value)} options={[{ value: 'paid', label: 'Paid' }, { value: 'pending', label: 'Pending' }, { value: 'partial', label: 'Partial' }]} />
          </div>
          
          <Textarea label="Notes" value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={2} />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit">{editingPurchase ? 'Update' : 'Save'} Purchase</Button>
          </div>
        </form>
      </Modal>
      
      {/* Document Viewer */}
      <Modal isOpen={!!showDocViewer} onClose={() => setShowDocViewer(null)} title={showDocViewer?.name || 'Document'} size="full">
        {showDocViewer && (
          <div className="h-[70vh]">
            {showDocViewer.type.includes('image') ? (
              <img src={showDocViewer.data} alt={showDocViewer.name} className="max-w-full max-h-full mx-auto object-contain" />
            ) : showDocViewer.type.includes('pdf') ? (
              <iframe src={showDocViewer.data} className="w-full h-full rounded-lg" title={showDocViewer.name} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <p>Preview not available. <button onClick={() => downloadDocument(showDocViewer)} className="text-red-600 hover:underline">Download file</button></p>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Purchase" message="Are you sure?" confirmText="Delete" variant="danger" />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Purchases;
