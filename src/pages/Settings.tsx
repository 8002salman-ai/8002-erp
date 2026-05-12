import React, { useRef, useState } from 'react';
import { Building2, MapPin, Save, Download, Trash2, Shield, Database, Upload } from 'lucide-react';
import { useDataStore, useAuthStore } from '../store/useStore';
import { US_STATES } from '../types';
import { Button, Card, Input, Select, Toast } from '../components/ui';

const Settings: React.FC = () => {
  const { settings, updateSettings, updateUser, updateAllUserPasswords, sales, expenses, purchases, users, importData } = useDataStore();
  const { logout } = useAuthStore();
  const [formData, setFormData] = useState(settings);
  const [adminPassword, setAdminPassword] = useState(settings.adminPassword || '');
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState(settings.adminPassword || '');
  const [globalPassword, setGlobalPassword] = useState('');
  const [globalPasswordConfirm, setGlobalPasswordConfirm] = useState('');
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>({});
  const [userPasswordConfirms, setUserPasswordConfirms] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPasswords, setIsUpdatingPasswords] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  
  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    if (adminPassword !== adminPasswordConfirm) {
      setToast({ message: 'Admin password confirmation does not match.', type: 'error' });
      return;
    }
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const updated = { ...formData, adminPassword };
    setFormData(updated);
    updateSettings(updated);
    setToast({ message: 'Settings saved successfully', type: 'success' });
    setIsSaving(false);
  };

  const handleApplyGlobalPassword = async () => {
    if (!globalPassword.trim()) {
      setToast({ message: 'Enter a password for all users.', type: 'error' });
      return;
    }
    if (globalPassword !== globalPasswordConfirm) {
      setToast({ message: 'Global password confirmation does not match.', type: 'error' });
      return;
    }
    setIsUpdatingPasswords(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateAllUserPasswords(globalPassword);
    setGlobalPassword('');
    setGlobalPasswordConfirm('');
    setToast({ message: 'All team passwords updated successfully.', type: 'success' });
    setIsUpdatingPasswords(false);
  };

  const handleTeamPasswordChange = (id: string, password: string) => {
    setUserPasswords(prev => ({ ...prev, [id]: password }));
  };

  const handleTeamPasswordConfirmChange = (id: string, password: string) => {
    setUserPasswordConfirms(prev => ({ ...prev, [id]: password }));
  };

  const handleUpdateTeamMemberPassword = async (id: string) => {
    const password = userPasswords[id] || '';
    const confirm = userPasswordConfirms[id] || '';
    if (!password.trim()) {
      setToast({ message: 'Enter a password before saving.', type: 'error' });
      return;
    }
    if (password !== confirm) {
      setToast({ message: 'Password confirmation does not match.', type: 'error' });
      return;
    }
    setIsUpdatingPasswords(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    updateUser(id, { password });
    setToast({ message: 'Team member password updated.', type: 'success' });
    setIsUpdatingPasswords(false);
  };
  
  const handleExportData = () => {
    const data = {
      settings,
      sales,
      expenses,
      purchases,
      users,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `8002_erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ message: 'Data exported successfully', type: 'success' });
  };

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid file format');

      // Basic shape validation (tolerant)
      const payload = {
        settings: parsed.settings,
        sales: parsed.sales,
        expenses: parsed.expenses,
        purchases: parsed.purchases,
        users: parsed.users,
        inventory: parsed.inventory,
        stockMovements: parsed.stockMovements,
      };

      importData(payload);
      setToast({ message: 'Data imported successfully', type: 'success' });
    } catch {
      setToast({ message: 'Import failed. Please select a valid backup JSON file.', type: 'error' });
    } finally {
      // allow re-importing same file
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };
  
  const handleClearData = () => {
    if (confirm('⚠️ WARNING: This will delete ALL your data permanently!\n\nAre you absolutely sure?')) {
      localStorage.removeItem('8002-data');
      localStorage.removeItem('8002-auth');
      localStorage.removeItem('8002-ui');
      localStorage.removeItem('embani-data');
      localStorage.removeItem('embani-auth');
      localStorage.removeItem('embani-ui');
      logout();
      window.location.reload();
    }
  };

  const stats = [
    { label: 'Sales', value: sales.length, color: 'text-emerald-600' },
    { label: 'Expenses', value: expenses.length, color: 'text-red-600' },
    { label: 'Purchases', value: purchases.length, color: 'text-blue-600' },
    { label: 'Team', value: users.length, color: 'text-purple-600' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Manage your business settings and data
        </p>
      </div>
      
      {/* Business Information */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <Building2 className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Business Information</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Used in reports and invoices</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <Input
            label="Business Name"
            value={formData.businessName}
            onChange={(e) => handleChange('businessName', e.target.value)}
            placeholder="8002 ERP"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.businessEmail || ''}
              onChange={(e) => handleChange('businessEmail', e.target.value)}
              placeholder="contact@example.com"
            />
            <Input
              label="Phone"
              value={formData.businessPhone || ''}
              onChange={(e) => handleChange('businessPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <Input
            label="Company Number"
            value={formData.businessCompanyNumber || ''}
            onChange={(e) => handleChange('businessCompanyNumber', e.target.value)}
            placeholder="e.g. 12345678"
          />
          
          <Input
            label="Address"
            value={formData.businessAddress || ''}
            onChange={(e) => handleChange('businessAddress', e.target.value)}
            placeholder="123 Business St, City, State ZIP"
          />
        </div>
      </Card>
      
      {/* Tax Settings */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tax Settings</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Configure tax calculation</p>
          </div>
        </div>
        
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="State"
              value={formData.state}
              onChange={(e) => handleChange('state', e.target.value)}
              options={US_STATES.map(s => ({ 
                value: s.code, 
                label: `${s.name} (${(s.rate * 100).toFixed(2)}%)` 
              }))}
            />
            <Select
              label="Business Structure"
              value={formData.businessStructure}
              onChange={(e) => handleChange('businessStructure', e.target.value)}
              options={[
                { value: 'individual', label: 'Individual / Personal' },
                { value: 'sole_proprietor', label: 'Sole Proprietor' },
                { value: 'llc', label: 'LLC' },
                { value: 'partnership', label: 'Partnership' },
                { value: 's-corp', label: 'S-Corp' },
                { value: 'c-corp', label: 'C-Corp' }
              ]}
            />
          </div>
          
          <Select
            label="Filing Status"
            value={formData.filingStatus}
            onChange={(e) => handleChange('filingStatus', e.target.value)}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'married', label: 'Married Filing Jointly' },
              { value: 'head_of_household', label: 'Head of Household' }
            ]}
          />
        </div>
      </Card>

      {/* Account Security */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <Shield className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account Security</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Update admin and team passwords</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Admin Password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Enter new admin password"
            />
            <Input
              label="Confirm Admin Password"
              type="password"
              value={adminPasswordConfirm}
              onChange={(e) => setAdminPasswordConfirm(e.target.value)}
              placeholder="Confirm new admin password"
            />
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
              Change every team member password at once. This will update the password for all users stored in the app.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="New Password for All Users"
                type="password"
                value={globalPassword}
                onChange={(e) => setGlobalPassword(e.target.value)}
                placeholder="Enter a new global password"
              />
              <Input
                label="Confirm Global Password"
                type="password"
                value={globalPasswordConfirm}
                onChange={(e) => setGlobalPasswordConfirm(e.target.value)}
                placeholder="Confirm the global password"
              />
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={handleApplyGlobalPassword} loading={isUpdatingPasswords}>
                Update All User Passwords
              </Button>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">Team Member Passwords</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Edit team member passwords from one place.</p>
              </div>
            </div>
            {users.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center text-slate-500 dark:text-slate-400">
                No team members added yet.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map(user => (
                  <div key={user.id} className="grid grid-cols-1 lg:grid-cols-[220px_1fr_1fr_120px] gap-4 items-end">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </div>
                    <Input
                      label="New Password"
                      type="password"
                      value={userPasswords[user.id] ?? ''}
                      onChange={(e) => handleTeamPasswordChange(user.id, e.target.value)}
                      placeholder="Enter new password"
                    />
                    <Input
                      label="Confirm Password"
                      type="password"
                      value={userPasswordConfirms[user.id] ?? ''}
                      onChange={(e) => handleTeamPasswordConfirmChange(user.id, e.target.value)}
                      placeholder="Confirm password"
                    />
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTeamMemberPassword(user.id)}
                        loading={isUpdatingPasswords}
                        className="w-full"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
      
      {/* Data Management */}
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <Database className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Backup or reset your data</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4" />
            Export Data
          </Button>
          <Button variant="outline" onClick={handleImportClick}>
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button variant="danger" onClick={handleClearData}>
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </Button>
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => handleImportFile(e.target.files?.[0] || null)}
        />
        
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> Clearing data will remove all sales, expenses, purchases, and team members. This cannot be undone.
          </p>
        </div>
      </Card>
      
      {/* Security Info */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <Shield className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Storage</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Your data is stored locally</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          All data is stored in your browser's local storage. We recommend regularly exporting your data as a backup. 
          Data is not synced across devices.
        </p>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button onClick={handleSave} loading={isSaving} size="lg" className="shadow-lg">
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Settings;
