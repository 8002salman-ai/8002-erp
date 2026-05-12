import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Search, Edit2, Trash2, ChevronLeft, ChevronRight, RefreshCw, Wallet } from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { usePermissions } from '../hooks/usePermissions';
import { Expense, EXPENSE_CATEGORIES, PAYMENT_METHODS } from '../types';
import { Button, Card, Badge, Modal, Input, Select, Textarea, ConfirmDialog, Toast, EmptyState } from '../components/ui';
import { formatCurrency } from '../utils/calculations';

const DEFAULT_EXPENSE: Partial<Expense> = {
  date: new Date().toISOString().split('T')[0],
  category: 'Miscellaneous',
  description: '',
  amount: 0,
  recurring: false,
  frequency: undefined,
  paymentMethod: 'Credit Card',
  notes: ''
};

const Expenses: React.FC = () => {
  const { expenses, addExpense, updateExpense, deleteExpense } = useDataStore();
  void usePermissions(); // available for future per-action gating
  
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<Partial<Expense>>(DEFAULT_EXPENSE);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !filterCategory || e.category === filterCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchTerm, filterCategory]);
  
  const totalPages = Math.ceil(filteredExpenses.length / perPage);
  const paginatedExpenses = filteredExpenses.slice((page - 1) * perPage, page * perPage);
  
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  
  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  
  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({ ...expense, date: expense.date.split('T')[0] });
    } else {
      setEditingExpense(null);
      setFormData({ ...DEFAULT_EXPENSE, date: new Date().toISOString().split('T')[0] });
    }
    setShowModal(true);
  };
  
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
    setFormData(DEFAULT_EXPENSE);
  };
  
  const handleChange = (field: keyof Expense, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      setToast({ message: 'Please fill in required fields', type: 'error' });
      return;
    }
    
    if (editingExpense) {
      updateExpense(editingExpense.id, formData);
      setToast({ message: 'Expense updated successfully', type: 'success' });
    } else {
      addExpense(formData as Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>);
      setToast({ message: 'Expense added successfully', type: 'success' });
    }
    handleCloseModal();
  };
  
  const confirmDelete = () => {
    if (deleteId) {
      deleteExpense(deleteId);
      setToast({ message: 'Expense deleted successfully', type: 'success' });
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            <span className="tabular-nums">{expenses.length}</span> expenses • 
            <span className="ml-1 tabular-nums text-red-600">{formatCurrency(totalAmount)}</span> total
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>
      
      {/* Category Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoryTotals.slice(0, 6).map(([category, amount]) => (
          <div 
            key={category} 
            onClick={() => setFilterCategory(filterCategory === category ? '' : category)}
            className="cursor-pointer"
          >
            <Card padding="sm" className="hover:border-red-300 dark:hover:border-red-700 transition-colors">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{category}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{formatCurrency(amount)}</p>
              {filterCategory === category && (
                <div className="w-full h-0.5 bg-red-500 mt-2 rounded-full" />
              )}
            </Card>
          </div>
        ))}
      </div>
      
      {/* Search */}
      <Card padding="sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
          >
            <option value="">All Categories</option>
            {EXPENSE_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>
      
      {/* Expenses Table */}
      <Card padding="none">
        {paginatedExpenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr className="text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {format(parseISO(expense.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant="default">{expense.category}</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-900 dark:text-white">
                      {expense.description}
                    </td>
                    <td className="px-4 py-4 text-sm text-red-600 dark:text-red-400 text-right font-bold tabular-nums">
                      -{formatCurrency(expense.amount)}
                    </td>
                    <td className="px-4 py-4">
                      {expense.recurring ? (
                        <Badge variant="info" dot>
                          <RefreshCw className="w-3 h-3 mr-1" />
                          {expense.frequency}
                        </Badge>
                      ) : (
                        <span className="text-sm text-slate-400">One-time</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenModal(expense)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDeleteId(expense.id); setShowDeleteConfirm(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<Wallet className="w-10 h-10" />}
            title="No expenses found"
            description="Start tracking your business expenses"
            action={<Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4" />Add Expense</Button>}
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
      
      {/* Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingExpense ? 'Edit Expense' : 'Add Expense'} size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Date" type="date" value={formData.date?.split('T')[0] || ''} onChange={(e) => handleChange('date', e.target.value)} required />
            <Select label="Category" value={formData.category || 'Miscellaneous'} onChange={(e) => handleChange('category', e.target.value)} options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c }))} />
          </div>
          
          <Input label="Description" value={formData.description || ''} onChange={(e) => handleChange('description', e.target.value)} placeholder="Enter expense description" required />
          
          <Input label="Amount" type="number" step="0.01" min={0} value={formData.amount || ''} onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)} placeholder="0.00" suffix={<span className="text-slate-400">$</span>} required />
          
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring || false}
              onChange={(e) => handleChange('recurring', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
            />
            <label htmlFor="recurring" className="text-sm text-slate-700 dark:text-slate-300">This is a recurring expense</label>
          </div>
          
          {formData.recurring && (
            <Select
              label="Frequency"
              value={formData.frequency || 'monthly'}
              onChange={(e) => handleChange('frequency', e.target.value)}
              options={[
                { value: 'monthly', label: 'Monthly' },
                { value: 'quarterly', label: 'Quarterly' },
                { value: 'yearly', label: 'Yearly' }
              ]}
            />
          )}
          
          <Select label="Payment Method" value={formData.paymentMethod || 'Credit Card'} onChange={(e) => handleChange('paymentMethod', e.target.value)} options={PAYMENT_METHODS.map(m => ({ value: m, label: m }))} />
          
          <Textarea label="Notes" value={formData.notes || ''} onChange={(e) => handleChange('notes', e.target.value)} rows={2} />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit">{editingExpense ? 'Update' : 'Save'} Expense</Button>
          </div>
        </form>
      </Modal>
      
      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} title="Delete Expense" message="Are you sure you want to delete this expense?" confirmText="Delete" variant="danger" />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Expenses;
