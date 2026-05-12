import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { User, Sale, Purchase, Expense, Settings, InventoryItem, StockMovement } from '../types';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

interface DataState {
  users: User[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  settings: Settings;
  
  // User actions
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  updateAllUserPasswords: (password: string) => void;
  deleteUser: (id: string) => void;
  
  // Sales actions
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt' | 'netProfit' | 'grossProfit' | 'profitMargin'>) => Sale;
  updateSale: (id: string, data: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  
  // Purchase actions
  addPurchase: (purchase: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalPurchaseCost' | 'costPerUnit'>) => Purchase;
  updatePurchase: (id: string, data: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Expense;
  updateExpense: (id: string, data: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  // Inventory actions
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'totalBought' | 'totalSold'>) => InventoryItem;
  updateInventoryItem: (id: string, data: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  addStockMovement: (mov: Omit<StockMovement, 'id' | 'createdAt'>) => void;
  
  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;

  // Import/Export helpers
  importData: (data: Partial<Pick<DataState, 'settings' | 'sales' | 'expenses' | 'purchases' | 'users' | 'inventory' | 'stockMovements'>>) => void;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
}

const defaultSettings: Settings = {
  businessName: 'Embani LLC',
  state: 'CA',
  taxRate: 0.0725,
  businessStructure: 'llc',
  filingStatus: 'single',
  businessCompanyNumber: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: 'admin@embani.com',
  adminPassword: 'Admin123@@@'
};

const defaultAdmin: User = {
  id: 'admin-001',
  email: 'admin@embani.com',
  password: 'Admin123@@@',
  name: 'Admin',
  role: 'ADMIN',
  commissionType: 'fixed',
  commissionRate: 0,
  commissionBase: 'net_profit',
  status: 'active',
  joinDate: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,
      
      login: (email: string, password: string) => {
        const { users, settings } = useDataStore.getState();
        const admin = { ...defaultAdmin, password: settings.adminPassword || defaultAdmin.password };
        const allUsers = [admin, ...users];
        const user = allUsers.find(u => u.email === email && u.password === password);
        
        if (user) {
          if (user.status === 'inactive') {
            return { success: false, error: 'Account is inactive. Contact admin.' };
          }
          set({ currentUser: user, isAuthenticated: true });
          return { success: true };
        }
        return { success: false, error: 'Invalid email or password' };
      },
      
      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      }
    }),
    { name: 'embani-auth' }
  )
);

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      users: [],
      sales: [],
      purchases: [],
      expenses: [],
      inventory: [],
      stockMovements: [],
      settings: defaultSettings,
      
      // User actions
      addUser: (userData) => {
        const now = new Date().toISOString();
        const newUser: User = {
          ...userData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now
        };
        set(state => ({ users: [...state.users, newUser] }));
        return newUser;
      },
      
      updateUser: (id, data) => {
        set(state => ({
          users: state.users.map(u => 
            u.id === id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
          )
        }));
      },

      updateAllUserPasswords: (password) => {
        set(state => ({
          users: state.users.map(u => ({ ...u, password, updatedAt: new Date().toISOString() }))
        }));
      },
      
      deleteUser: (id) => {
        set(state => ({ users: state.users.filter(u => u.id !== id) }));
      },
      
      // Sales actions
      addSale: (saleData) => {
        const now = new Date().toISOString();
        const isNegative = saleData.deliveryStatus === 'returned' || saleData.deliveryStatus === 'refunded';
        const totalItemCost = (saleData.productCost || 0) + (saleData.stockItemPrice || 0);
        
        let netProfit: number;
        let grossProfit: number;
        
        if (isNegative) {
          netProfit = -(totalItemCost + (saleData.shippingCost || 0) + (saleData.thirdPlCost || 0) + (saleData.otherExpenses || 0));
          grossProfit = -totalItemCost;
        } else {
          grossProfit = saleData.saleAmount - totalItemCost;
          netProfit = saleData.saleAmount - totalItemCost - (saleData.marketplaceFee || 0) - (saleData.salesTax || 0) - (saleData.shippingCost || 0) - (saleData.thirdPlCost || 0) - (saleData.otherExpenses || 0);
        }
        
        const profitMargin = saleData.saleAmount > 0 ? (netProfit / saleData.saleAmount) * 100 : 0;
        
        const saleId = uuidv4();
        const newSale: Sale = {
          ...saleData,
          id: saleId,
          netProfit,
          grossProfit,
          profitMargin,
          createdAt: now,
          updatedAt: now
        };
        set(state => {
          const updates: Partial<{ sales: Sale[]; inventory: typeof state.inventory; stockMovements: typeof state.stockMovements }> = {
            sales: [...state.sales, newSale]
          };
          // Auto-deduct from inventory if linked
          if (saleData.inventoryItemId) {
            const item = state.inventory.find(i => i.id === saleData.inventoryItemId);
            if (item) {
              const qty = saleData.quantity || 1;
              updates.inventory = state.inventory.map(i =>
                i.id === saleData.inventoryItemId
                  ? { ...i, currentStock: Math.max(0, i.currentStock - qty), totalSold: i.totalSold + qty, updatedAt: now }
                  : i
              );
              updates.stockMovements = [...state.stockMovements, {
                id: uuidv4(),
                inventoryItemId: saleData.inventoryItemId,
                type: 'sale_out' as const,
                quantity: -qty,
                referenceId: saleId,
                referenceType: 'sale' as const,
                notes: `Sold: ${saleData.productName} (Order: ${saleData.orderNumber})`,
                date: now,
                createdAt: now
              }];
            }
          }
          return updates;
        });
        return newSale;
      },
      
      updateSale: (id, data) => {
        set(state => ({
          sales: state.sales.map(s => {
            if (s.id !== id) return s;
            
            const updated = { ...s, ...data };
            const isNegative = updated.deliveryStatus === 'returned' || updated.deliveryStatus === 'refunded';
            const totalItemCost = (updated.productCost || 0) + (updated.stockItemPrice || 0);
            
            let netProfit: number;
            let grossProfit: number;
            
            if (isNegative) {
              netProfit = -(totalItemCost + (updated.shippingCost || 0) + (updated.thirdPlCost || 0) + (updated.otherExpenses || 0));
              grossProfit = -totalItemCost;
            } else {
              grossProfit = updated.saleAmount - totalItemCost;
              netProfit = updated.saleAmount - totalItemCost - (updated.marketplaceFee || 0) - (updated.salesTax || 0) - (updated.shippingCost || 0) - (updated.thirdPlCost || 0) - (updated.otherExpenses || 0);
            }
            
            const profitMargin = updated.saleAmount > 0 ? (netProfit / updated.saleAmount) * 100 : 0;
            
            return {
              ...updated,
              netProfit,
              grossProfit,
              profitMargin,
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },
      
      deleteSale: (id) => {
        set(state => ({ sales: state.sales.filter(s => s.id !== id) }));
      },
      
      // Purchase actions
      addPurchase: (purchaseData) => {
        const now = new Date().toISOString();
        const totalPurchaseCost = purchaseData.totalCost + purchaseData.shippingCost + purchaseData.importFees + purchaseData.otherCharges;
        const costPerUnit = purchaseData.quantity > 0 ? totalPurchaseCost / purchaseData.quantity : 0;
        
        const newPurchase: Purchase = {
          ...purchaseData,
          id: uuidv4(),
          totalPurchaseCost,
          costPerUnit,
          createdAt: now,
          updatedAt: now
        };
        set(state => ({ purchases: [...state.purchases, newPurchase] }));
        return newPurchase;
      },
      
      updatePurchase: (id, data) => {
        set(state => ({
          purchases: state.purchases.map(p => {
            if (p.id !== id) return p;
            const updated = { ...p, ...data };
            const totalPurchaseCost = updated.totalCost + updated.shippingCost + updated.importFees + updated.otherCharges;
            const costPerUnit = updated.quantity > 0 ? totalPurchaseCost / updated.quantity : 0;
            return {
              ...updated,
              totalPurchaseCost,
              costPerUnit,
              updatedAt: new Date().toISOString()
            };
          })
        }));
      },
      
      deletePurchase: (id) => {
        set(state => ({ purchases: state.purchases.filter(p => p.id !== id) }));
      },
      
      // Expense actions
      addExpense: (expenseData) => {
        const now = new Date().toISOString();
        const newExpense: Expense = {
          ...expenseData,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now
        };
        set(state => ({ expenses: [...state.expenses, newExpense] }));
        return newExpense;
      },
      
      updateExpense: (id, data) => {
        set(state => ({
          expenses: state.expenses.map(e => 
            e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e
          )
        }));
      },
      
      deleteExpense: (id) => {
        set(state => ({ expenses: state.expenses.filter(e => e.id !== id) }));
      },
      
      // Inventory actions
      addInventoryItem: (itemData) => {
        const now = new Date().toISOString();
        const newItem: InventoryItem = {
          ...itemData,
          id: uuidv4(),
          totalBought: 0,
          totalSold: 0,
          createdAt: now,
          updatedAt: now
        };
        set(state => ({ inventory: [...state.inventory, newItem] }));
        return newItem;
      },

      updateInventoryItem: (id, data) => {
        set(state => ({
          inventory: state.inventory.map(i =>
            i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i
          )
        }));
      },

      deleteInventoryItem: (id) => {
        set(state => ({
          inventory: state.inventory.filter(i => i.id !== id),
          stockMovements: state.stockMovements.filter(m => m.inventoryItemId !== id)
        }));
      },

      addStockMovement: (movData) => {
        const now = new Date().toISOString();
        const mov: StockMovement = { ...movData, id: uuidv4(), createdAt: now };
        set(state => {
          const item = state.inventory.find(i => i.id === mov.inventoryItemId);
          if (!item) return { stockMovements: [...state.stockMovements, mov] };
          const newStock = item.currentStock + mov.quantity;
          const isBuy = mov.type === 'purchase_in' || mov.type === 'return_in';
          const isSell = mov.type === 'sale_out';
          return {
            stockMovements: [...state.stockMovements, mov],
            inventory: state.inventory.map(i =>
              i.id === mov.inventoryItemId
                ? {
                    ...i,
                    currentStock: Math.max(0, newStock),
                    totalBought: isBuy ? i.totalBought + Math.abs(mov.quantity) : i.totalBought,
                    totalSold: isSell ? i.totalSold + Math.abs(mov.quantity) : i.totalSold,
                    lastRestocked: isBuy ? now : i.lastRestocked,
                    updatedAt: now
                  }
                : i
            )
          };
        });
      },
      
      // Settings actions
      updateSettings: (newSettings) => {
        set(state => ({ settings: { ...state.settings, ...newSettings } }));
      },

      importData: (data) => {
        set(state => ({
          settings: data.settings ? { ...state.settings, ...data.settings } : state.settings,
          sales: Array.isArray(data.sales) ? data.sales : state.sales,
          expenses: Array.isArray(data.expenses) ? data.expenses : state.expenses,
          purchases: Array.isArray(data.purchases) ? data.purchases : state.purchases,
          users: Array.isArray(data.users) ? data.users : state.users,
          inventory: Array.isArray(data.inventory) ? data.inventory : state.inventory,
          stockMovements: Array.isArray(data.stockMovements) ? data.stockMovements : state.stockMovements,
        }));
      },
    }),
    { name: 'embani-data' }
  )
);

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      
      toggleTheme: () => {
        set(state => {
          const newTheme = state.theme === 'light' ? 'dark' : 'light';
          // Apply immediately
          if (typeof document !== 'undefined') {
            if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
              document.documentElement.style.colorScheme = 'dark';
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
            }
          }
          return { theme: newTheme };
        });
      },
      
      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },
      
      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      }
    }),
    { 
      name: 'embani-ui',
      onRehydrateStorage: () => (state) => {
        // Apply theme on page load
        if (state && typeof document !== 'undefined') {
          if (state.theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
          }
        }
      }
    }
  )
);
