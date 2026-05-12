export type UserRole = 'ADMIN' | 'VA';

// All possible permissions for a VA
export interface VAPermissions {
  // Sales
  sales_view: boolean;
  sales_add: boolean;
  sales_edit: boolean;
  sales_delete: boolean;
  sales_export: boolean;
  sales_invoice: boolean;
  // Purchases / Buying
  purchases_view: boolean;
  purchases_add: boolean;
  purchases_edit: boolean;
  purchases_delete: boolean;
  // Inventory
  inventory_view: boolean;
  inventory_add: boolean;
  inventory_edit: boolean;
  // Expenses
  expenses_view: boolean;
  expenses_add: boolean;
  expenses_edit: boolean;
  expenses_delete: boolean;
  // Reports
  reports_view: boolean;
  reports_download: boolean;
  // Dashboard
  dashboard_profit: boolean;
  dashboard_charts: boolean;
}

// Default permissions for new VAs
export const DEFAULT_VA_PERMISSIONS: VAPermissions = {
  sales_view: true,
  sales_add: true,
  sales_edit: false,
  sales_delete: false,
  sales_export: false,
  sales_invoice: false,
  purchases_view: false,
  purchases_add: false,
  purchases_edit: false,
  purchases_delete: false,
  inventory_view: false,
  inventory_add: false,
  inventory_edit: false,
  expenses_view: false,
  expenses_add: false,
  expenses_edit: false,
  expenses_delete: false,
  reports_view: false,
  reports_download: false,
  dashboard_profit: true,
  dashboard_charts: false,
};

// Permission labels for the UI
export const PERMISSION_LABELS: Record<keyof VAPermissions, { label: string; group: string; description: string }> = {
  sales_view:       { label: 'View Sales',        group: 'Sales',      description: 'Can see the sales list' },
  sales_add:        { label: 'Add Sales',         group: 'Sales',      description: 'Can add new sales' },
  sales_edit:       { label: 'Edit Sales',        group: 'Sales',      description: 'Can edit existing sales' },
  sales_delete:     { label: 'Delete Sales',      group: 'Sales',      description: 'Can delete sales' },
  sales_export:     { label: 'Export Sales',      group: 'Sales',      description: 'Can export sales CSV' },
  sales_invoice:    { label: 'Download Invoice',  group: 'Sales',      description: 'Can download sale invoices' },
  purchases_view:   { label: 'View Purchases',    group: 'Purchases',  description: 'Can see purchase/buying list' },
  purchases_add:    { label: 'Add Purchases',     group: 'Purchases',  description: 'Can add new purchases' },
  purchases_edit:   { label: 'Edit Purchases',    group: 'Purchases',  description: 'Can edit purchases' },
  purchases_delete: { label: 'Delete Purchases',  group: 'Purchases',  description: 'Can delete purchases' },
  inventory_view:   { label: 'View Inventory',    group: 'Inventory',  description: 'Can see stock levels' },
  inventory_add:    { label: 'Adjust Stock',      group: 'Inventory',  description: 'Can manually adjust stock' },
  inventory_edit:   { label: 'Edit Products',     group: 'Inventory',  description: 'Can edit inventory items' },
  expenses_view:    { label: 'View Expenses',     group: 'Expenses',   description: 'Can see expense list' },
  expenses_add:     { label: 'Add Expenses',      group: 'Expenses',   description: 'Can add new expenses' },
  expenses_edit:    { label: 'Edit Expenses',     group: 'Expenses',   description: 'Can edit expenses' },
  expenses_delete:  { label: 'Delete Expenses',   group: 'Expenses',   description: 'Can delete expenses' },
  reports_view:     { label: 'View Reports',      group: 'Reports',    description: 'Can see reports page' },
  reports_download: { label: 'Download Reports',  group: 'Reports',    description: 'Can download PDF reports' },
  dashboard_profit: { label: 'View Profit/Loss',  group: 'Dashboard',  description: 'Can see profit & loss numbers' },
  dashboard_charts: { label: 'View Charts',       group: 'Dashboard',  description: 'Can see analytics charts' },
};

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string;
  address?: string;
  commissionType: 'fixed' | 'percentage' | 'hybrid';
  commissionRate: number;
  commissionBase: 'total_sales' | 'net_profit' | 'per_product';
  fixedSalary?: number;
  status: 'active' | 'inactive';
  joinDate: string;
  notes?: string;
  permissions?: VAPermissions; // NEW: per-VA permissions
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  date: string;
  deliveryDate?: string;
  productName: string;
  orderNumber: string;
  customerName: string;
  customerAddress?: string;
  trackingNumber?: string;
  buyingAccount: string;
  marketplace: string;
  deliveryStatus: 'pending' | 'shipped' | 'delivered' | 'returned' | 'refunded' | 'cancelled';
  quantity: number;
  productCost: number;
  stockItemPrice: number;    // Price of item from your own stock/inventory
  saleAmount: number;
  marketplaceFee: number;
  salesTax: number;          // Sales tax collected/paid
  shippingCost: number;
  thirdPlCost: number;       // 3PL fulfillment cost
  otherExpenses: number;
  netProfit: number;
  grossProfit: number;
  profitMargin: number;
  inventoryItemId?: string;     // linked inventory product (auto deduct stock)
  notes?: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  type: string;
  data: string; // base64 encoded
  uploadedAt: string;
}

export interface Purchase {
  id: string;
  date: string;
  productName: string;
  supplier: string;
  invoiceNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  shippingCost: number;
  importFees: number;
  otherCharges: number;
  totalPurchaseCost: number;
  costPerUnit: number;
  invoiceUrl?: string;
  documents?: DocumentFile[]; // NEW: Multiple document uploads
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'partial';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  recurring: boolean;
  frequency?: 'monthly' | 'quarterly' | 'yearly';
  paymentMethod?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  sku: string;
  productName: string;
  category?: string;
  brand?: string;
  supplier?: string;
  supplierLink?: string;        // AliExpress / supplier URL
  condition: 'new' | 'used' | 'refurbished' | 'open_box';
  color?: string;
  size?: string;
  weight?: string;              // e.g. "0.5 lbs"
  dimensions?: string;          // e.g. "10x5x3 in"
  upc?: string;                 // barcode
  asin?: string;                // Amazon ASIN
  storageLocation?: string;     // e.g. "Shelf A3", "Warehouse B"
  costPerUnit: number;          // buying / cost price
  currentStock: number;
  lowStockThreshold: number;
  totalBought: number;
  totalSold: number;
  lastRestocked?: string;
  tags?: string;                // comma separated tags
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: 'purchase_in' | 'sale_out' | 'adjustment' | 'return_in';
  quantity: number;  // positive = in, negative = out
  referenceId?: string; // purchase or sale ID
  referenceType?: 'purchase' | 'sale';
  notes?: string;
  date: string;
  createdAt: string;
}

export interface Settings {
  businessName: string;
  state: string;
  taxRate: number;
  businessStructure: 'llc' | 's-corp' | 'sole_proprietor' | 'individual' | 'partnership' | 'c-corp';
  filingStatus: 'single' | 'married' | 'head_of_household';
  businessCompanyNumber?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  adminPassword?: string;
  aiApiKey?: string;
}

export const MARKETPLACES = [
  'eBay',
  'Etsy',
  'Depop',
  'Mercari',
  'TikTok Shop',
  'Amazon',
  'Shopify',
  'Other'
] as const;

export const DELIVERY_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'shipped', label: 'Shipped', color: 'blue' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'returned', label: 'Returned', color: 'red' },
  { value: 'refunded', label: 'Refunded', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' }
] as const;

export const EXPENSE_CATEGORIES = [
  'VPS/Hosting',
  'Proxy Services',
  'Phone Bills',
  'Internet',
  'Advertising',
  'Software Subscriptions',
  'Packaging Materials',
  'Shipping Supplies',
  'Office Expenses',
  'VA Salary',
  'Miscellaneous'
] as const;

export const PAYMENT_METHODS = [
  'Credit Card',
  'Bank Transfer',
  'PayPal',
  'Cash',
  'Other'
] as const;

export const US_STATES = [
  { code: 'AL', name: 'Alabama', rate: 0.05 },
  { code: 'AK', name: 'Alaska', rate: 0 },
  { code: 'AZ', name: 'Arizona', rate: 0.025 },
  { code: 'AR', name: 'Arkansas', rate: 0.055 },
  { code: 'CA', name: 'California', rate: 0.0725 },
  { code: 'CO', name: 'Colorado', rate: 0.0455 },
  { code: 'CT', name: 'Connecticut', rate: 0.0499 },
  { code: 'DE', name: 'Delaware', rate: 0 },
  { code: 'FL', name: 'Florida', rate: 0 },
  { code: 'GA', name: 'Georgia', rate: 0.055 },
  { code: 'HI', name: 'Hawaii', rate: 0.0825 },
  { code: 'ID', name: 'Idaho', rate: 0.058 },
  { code: 'IL', name: 'Illinois', rate: 0.0495 },
  { code: 'IN', name: 'Indiana', rate: 0.0323 },
  { code: 'IA', name: 'Iowa', rate: 0.06 },
  { code: 'KS', name: 'Kansas', rate: 0.057 },
  { code: 'KY', name: 'Kentucky', rate: 0.05 },
  { code: 'LA', name: 'Louisiana', rate: 0.0425 },
  { code: 'ME', name: 'Maine', rate: 0.0715 },
  { code: 'MD', name: 'Maryland', rate: 0.0575 },
  { code: 'MA', name: 'Massachusetts', rate: 0.05 },
  { code: 'MI', name: 'Michigan', rate: 0.0425 },
  { code: 'MN', name: 'Minnesota', rate: 0.0985 },
  { code: 'MS', name: 'Mississippi', rate: 0.05 },
  { code: 'MO', name: 'Missouri', rate: 0.054 },
  { code: 'MT', name: 'Montana', rate: 0.0675 },
  { code: 'NE', name: 'Nebraska', rate: 0.0684 },
  { code: 'NV', name: 'Nevada', rate: 0 },
  { code: 'NH', name: 'New Hampshire', rate: 0 },
  { code: 'NJ', name: 'New Jersey', rate: 0.1075 },
  { code: 'NM', name: 'New Mexico', rate: 0.059 },
  { code: 'NY', name: 'New York', rate: 0.109 },
  { code: 'NC', name: 'North Carolina', rate: 0.0525 },
  { code: 'ND', name: 'North Dakota', rate: 0.029 },
  { code: 'OH', name: 'Ohio', rate: 0.04 },
  { code: 'OK', name: 'Oklahoma', rate: 0.05 },
  { code: 'OR', name: 'Oregon', rate: 0.099 },
  { code: 'PA', name: 'Pennsylvania', rate: 0.0307 },
  { code: 'RI', name: 'Rhode Island', rate: 0.0599 },
  { code: 'SC', name: 'South Carolina', rate: 0.07 },
  { code: 'SD', name: 'South Dakota', rate: 0 },
  { code: 'TN', name: 'Tennessee', rate: 0 },
  { code: 'TX', name: 'Texas', rate: 0 },
  { code: 'UT', name: 'Utah', rate: 0.0485 },
  { code: 'VT', name: 'Vermont', rate: 0.0875 },
  { code: 'VA', name: 'Virginia', rate: 0.0575 },
  { code: 'WA', name: 'Washington', rate: 0 },
  { code: 'WV', name: 'West Virginia', rate: 0.065 },
  { code: 'WI', name: 'Wisconsin', rate: 0.0765 },
  { code: 'WY', name: 'Wyoming', rate: 0 }
] as const;
