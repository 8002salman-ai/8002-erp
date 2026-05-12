import React, { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Edit2, Trash2, Users, UserCheck, UserX, Mail, TrendingUp, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { User, VAPermissions, DEFAULT_VA_PERMISSIONS, PERMISSION_LABELS } from '../types';
import { Button, Card, Badge, Modal, Input, Select, Textarea, ConfirmDialog, Toast, EmptyState } from '../components/ui';
import { formatCurrency } from '../utils/calculations';

const DEFAULT_VA: Partial<User> = {
  name: '', email: '', password: '', phone: '', address: '',
  role: 'VA', commissionType: 'percentage', commissionRate: 50,
  commissionBase: 'net_profit', fixedSalary: 0, status: 'active',
  joinDate: new Date().toISOString().split('T')[0], notes: '',
  permissions: { ...DEFAULT_VA_PERMISSIONS },
};

// Group permissions for UI
const PERMISSION_GROUPS = ['Sales', 'Purchases', 'Inventory', 'Expenses', 'Reports', 'Dashboard'] as const;

const VAManagement: React.FC = () => {
  const { users, sales, addUser, updateUser, deleteUser } = useDataStore();
  const [showModal, setShowModal] = useState(false);
  const [editingVA, setEditingVA] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>(DEFAULT_VA);
  const [formPermissions, setFormPermissions] = useState<VAPermissions>({ ...DEFAULT_VA_PERMISSIONS });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>('Sales');

  const vas = useMemo(() => users.filter(u => u.role === 'VA'), [users]);

  const vaPerformance = useMemo(() => {
    return vas.map(va => {
      const vaSales = sales.filter(s => s.buyingAccount === va.name || s.userId === va.id);
      const totalSales = vaSales.reduce((sum, s) => sum + s.saleAmount, 0);
      const totalProfit = vaSales.reduce((sum, s) => sum + s.netProfit, 0);
      const orderCount = vaSales.length;
      let commission = 0;
      if (va.commissionType === 'fixed') commission = va.fixedSalary || 0;
      else if (va.commissionType === 'percentage') {
        const base = va.commissionBase === 'total_sales' ? totalSales : totalProfit;
        commission = base * (va.commissionRate / 100);
      } else if (va.commissionType === 'hybrid') {
        const base = va.commissionBase === 'total_sales' ? totalSales : totalProfit;
        commission = (va.fixedSalary || 0) + base * (va.commissionRate / 100);
      }
      return { ...va, totalSales, totalProfit, orderCount, commission };
    });
  }, [vas, sales]);

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let pw = '';
    for (let i = 0; i < 12; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password: pw }));
  };

  const handleOpenModal = (va?: User) => {
    if (va) {
      setEditingVA(va);
      setFormData({ ...va, joinDate: va.joinDate.split('T')[0] });
      setFormPermissions(va.permissions ? { ...DEFAULT_VA_PERMISSIONS, ...va.permissions } : { ...DEFAULT_VA_PERMISSIONS });
    } else {
      setEditingVA(null);
      setFormData({ ...DEFAULT_VA, joinDate: new Date().toISOString().split('T')[0] });
      setFormPermissions({ ...DEFAULT_VA_PERMISSIONS });
      generatePassword();
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingVA(null);
  };

  const handleChange = (field: keyof User, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePermission = (key: keyof VAPermissions) => {
    setFormPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleGroupAll = (group: string, value: boolean) => {
    const keys = (Object.keys(PERMISSION_LABELS) as (keyof VAPermissions)[])
      .filter(k => PERMISSION_LABELS[k].group === group);
    setFormPermissions(prev => {
      const next = { ...prev };
      keys.forEach(k => { next[k] = value; });
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setToast({ message: 'Please fill in required fields', type: 'error' });
      return;
    }
    const existingUser = users.find(u => u.email === formData.email && u.id !== editingVA?.id);
    if (existingUser) {
      setToast({ message: 'Email already in use', type: 'error' });
      return;
    }
    const dataWithPerms = { ...formData, permissions: formPermissions };
    if (editingVA) {
      updateUser(editingVA.id, dataWithPerms);
      setToast({ message: 'Team member updated', type: 'success' });
    } else {
      addUser(dataWithPerms as Omit<User, 'id' | 'createdAt' | 'updatedAt'>);
      setToast({ message: 'Team member added', type: 'success' });
    }
    handleCloseModal();
  };

  const toggleStatus = (va: User) => {
    updateUser(va.id, { status: va.status === 'active' ? 'inactive' : 'active' });
    setToast({ message: `${va.name} ${va.status === 'active' ? 'deactivated' : 'activated'}`, type: 'success' });
  };

  const confirmDelete = () => {
    if (deleteId) { deleteUser(deleteId); setToast({ message: 'Deleted', type: 'success' }); setDeleteId(null); }
  };

  const copyCredentials = (va: User) => {
    navigator.clipboard.writeText(`Login Credentials\n\nEmail: ${va.email}\nPassword: ${va.password}\n\nPlease change your password after login.`);
    setToast({ message: 'Credentials copied', type: 'success' });
  };

  // Count enabled permissions for a VA
  const countPerms = (perms?: VAPermissions) => {
    if (!perms) return 0;
    return Object.values(perms).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {vas.length} members • {vas.filter(v => v.status === 'active').length} active
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" /> Add Team Member
        </Button>
      </div>

      {vaPerformance.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vaPerformance.map((va) => (
            <Card key={va.id} className={`relative overflow-hidden ${va.status === 'inactive' ? 'opacity-60' : ''}`}>
              <div className={`absolute top-0 right-0 w-20 h-20 ${va.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'} opacity-10 rounded-bl-full`} />
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ${va.status === 'active' ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-slate-400'}`}>
                    {va.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{va.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{va.email}</p>
                  </div>
                </div>
                <Badge variant={va.status === 'active' ? 'success' : 'default'} dot>{va.status}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sales</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(va.totalSales)}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Orders</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{va.orderCount}</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Profit</p>
                  <p className={`text-lg font-bold tabular-nums ${va.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(va.totalProfit)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Commission</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 tabular-nums">{formatCurrency(va.commission)}</p>
                </div>
              </div>

              {/* Permissions badge */}
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {countPerms(va.permissions)} of {Object.keys(PERMISSION_LABELS).length} permissions
                </span>
              </div>

              {/* Permission pills */}
              <div className="flex flex-wrap gap-1 mb-4">
                {va.permissions && (Object.entries(va.permissions) as [keyof VAPermissions, boolean][])
                  .filter(([, v]) => v)
                  .slice(0, 5)
                  .map(([key]) => (
                    <span key={key} className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {PERMISSION_LABELS[key]?.label}
                    </span>
                  ))
                }
                {va.permissions && Object.values(va.permissions).filter(Boolean).length > 5 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                    +{Object.values(va.permissions).filter(Boolean).length - 5} more
                  </span>
                )}
              </div>

              <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                <p className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">
                    {va.commissionType === 'fixed' ? `Fixed ${formatCurrency(va.fixedSalary || 0)}` :
                      va.commissionType === 'percentage' ? `${va.commissionRate}% of ${va.commissionBase === 'total_sales' ? 'sales' : 'profit'}` :
                      `${formatCurrency(va.fixedSalary || 0)} + ${va.commissionRate}%`}
                  </span>
                </p>
                <p>Joined: {format(parseISO(va.joinDate), 'MMM dd, yyyy')}</p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" size="sm" onClick={() => handleOpenModal(va)} title="Edit"><Edit2 className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => toggleStatus(va)} title={va.status === 'active' ? 'Deactivate' : 'Activate'}>
                  {va.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => copyCredentials(va)} title="Copy credentials"><Mail className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => { setDeleteId(va.id); setShowDeleteConfirm(true); }} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Users className="w-10 h-10" />} title="No team members" description="Add your first VA" action={<Button onClick={() => handleOpenModal()}><Plus className="w-4 h-4" />Add Team Member</Button>} />
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={handleCloseModal} title={editingVA ? 'Edit Team Member' : 'Add Team Member'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Basic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full Name *" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="Enter full name" required />
              <Input label="Email *" type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} placeholder="email@example.com" required />
              <div>
                <Input label="Password *" value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} required />
                <button type="button" onClick={generatePassword} className="text-sm text-red-600 dark:text-red-400 hover:underline mt-1.5">Generate password</button>
              </div>
              <Input label="Phone" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} placeholder="Phone number" />
            </div>
            <div className="mt-4">
              <Textarea label="Address" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} rows={2} />
            </div>
          </div>

          {/* Commission */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 uppercase tracking-wider">Commission Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select label="Type" value={formData.commissionType || 'percentage'} onChange={e => handleChange('commissionType', e.target.value)}
                options={[{ value: 'fixed', label: 'Fixed Salary' }, { value: 'percentage', label: 'Percentage' }, { value: 'hybrid', label: 'Hybrid' }]} />
              {(formData.commissionType === 'percentage' || formData.commissionType === 'hybrid') && (
                <Input label="Rate (%)" type="number" min={0} max={100} value={formData.commissionRate || 50} onChange={e => handleChange('commissionRate', parseFloat(e.target.value) || 0)} />
              )}
              {(formData.commissionType === 'fixed' || formData.commissionType === 'hybrid') && (
                <Input label="Fixed Amount ($)" type="number" min={0} value={formData.fixedSalary || ''} onChange={e => handleChange('fixedSalary', parseFloat(e.target.value) || 0)} />
              )}
            </div>
            {(formData.commissionType === 'percentage' || formData.commissionType === 'hybrid') && (
              <div className="mt-4">
                <Select label="Commission Base" value={formData.commissionBase || 'net_profit'} onChange={e => handleChange('commissionBase', e.target.value)}
                  options={[{ value: 'total_sales', label: 'Total Sales' }, { value: 'net_profit', label: 'Net Profit' }]} />
              </div>
            )}
          </div>

          {/* ===== PERMISSIONS SECTION ===== */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Access Permissions</h3>
              <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                {Object.values(formPermissions).filter(Boolean).length} / {Object.keys(formPermissions).length} enabled
              </span>
            </div>

            <div className="space-y-2">
              {PERMISSION_GROUPS.map(group => {
                const keys = (Object.keys(PERMISSION_LABELS) as (keyof VAPermissions)[])
                  .filter(k => PERMISSION_LABELS[k].group === group);
                const allEnabled = keys.every(k => formPermissions[k]);
                const someEnabled = keys.some(k => formPermissions[k]);
                const isExpanded = expandedGroup === group;

                return (
                  <div key={group} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                    {/* Group header */}
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : group)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allEnabled}
                          ref={el => { if (el) el.indeterminate = someEnabled && !allEnabled; }}
                          onChange={e => { e.stopPropagation(); toggleGroupAll(group, !allEnabled); }}
                          className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                          onClick={e => e.stopPropagation()}
                        />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">{group}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ({keys.filter(k => formPermissions[k]).length}/{keys.length})
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    {/* Permission items */}
                    {isExpanded && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {keys.map(key => (
                          <label key={key} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formPermissions[key]}
                              onChange={() => togglePermission(key)}
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{PERMISSION_LABELS[key].label}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{PERMISSION_LABELS[key].description}</p>
                            </div>
                            {formPermissions[key] && (
                              <Badge variant="success" size="sm">ON</Badge>
                            )}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status & Dates */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Join Date" type="date" value={formData.joinDate?.split('T')[0] || ''} onChange={e => handleChange('joinDate', e.target.value)} />
              <Select label="Status" value={formData.status || 'active'} onChange={e => handleChange('status', e.target.value)}
                options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            </div>
          </div>

          <Textarea label="Notes" value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} rows={2} />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="secondary" type="button" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit">{editingVA ? 'Update' : 'Add'} Team Member</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete}
        title="Delete Team Member" message="Are you sure? This action cannot be undone." confirmText="Delete" variant="danger" />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default VAManagement;
