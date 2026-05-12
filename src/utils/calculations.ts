import { Sale, Expense, User, US_STATES } from '../types';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';

export function calculateSaleProfit(sale: Partial<Sale>): {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
} {
  const saleAmount = sale.saleAmount || 0;
  const productCost = sale.productCost || 0;
  const stockItemPrice = sale.stockItemPrice || 0;
  const marketplaceFee = sale.marketplaceFee || 0;
  const salesTax = sale.salesTax || 0;
  const shippingCost = sale.shippingCost || 0;
  const thirdPlCost = sale.thirdPlCost || 0;
  const otherExpenses = sale.otherExpenses || 0;
  const isNegative = sale.deliveryStatus === 'returned' || sale.deliveryStatus === 'refunded';

  // Total cost = buying cost + stock item price (if used from own inventory)
  const totalItemCost = productCost + stockItemPrice;

  let grossProfit: number;
  let netProfit: number;

  if (isNegative) {
    netProfit = -(totalItemCost + shippingCost + thirdPlCost + otherExpenses);
    grossProfit = -totalItemCost;
  } else {
    grossProfit = saleAmount - totalItemCost;
    netProfit = saleAmount - totalItemCost - marketplaceFee - salesTax - shippingCost - thirdPlCost - otherExpenses;
  }

  const profitMargin = saleAmount > 0 ? (netProfit / saleAmount) * 100 : 0;

  return { grossProfit, netProfit, profitMargin };
}

export function getMonthlyData(sales: Sale[], expenses: Expense[], users: User[], month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const monthlySales = sales.filter(s => {
    const saleDate = parseISO(s.date);
    return isWithinInterval(saleDate, { start: monthStart, end: monthEnd });
  });

  const monthlyExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.date);
    return isWithinInterval(expenseDate, { start: monthStart, end: monthEnd });
  });

  const totalOrders = monthlySales.length;
  const totalRevenue = monthlySales.reduce((sum, s) => sum + s.saleAmount, 0);
  const totalCOGS = monthlySales.reduce((sum, s) => sum + (s.productCost * s.quantity), 0);
  const totalGrossProfit = monthlySales.reduce((sum, s) => sum + s.grossProfit, 0);
  const totalNetProfit = monthlySales.reduce((sum, s) => sum + s.netProfit, 0);

  // Marketplace breakdown
  const marketplaceBreakdown: Record<string, number> = {};
  monthlySales.forEach(s => {
    marketplaceBreakdown[s.marketplace] = (marketplaceBreakdown[s.marketplace] || 0) + s.saleAmount;
  });

  // Expense breakdown by category
  const expenseBreakdown: Record<string, number> = {};
  monthlyExpenses.forEach(e => {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
  });

  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // VA Commission calculation
  const vaCommissions: { name: string; sales: number; commission: number }[] = [];
  users.filter(u => u.role === 'VA' && u.status === 'active').forEach(va => {
    const vaSales = monthlySales.filter(s => s.buyingAccount === va.name || s.userId === va.id);
    const vaTotalSales = vaSales.reduce((sum, s) => sum + s.saleAmount, 0);
    const vaNetProfit = vaSales.reduce((sum, s) => sum + s.netProfit, 0);

    let commission = 0;
    if (va.commissionType === 'fixed') {
      commission = va.fixedSalary || 0;
    } else if (va.commissionType === 'percentage') {
      const base = va.commissionBase === 'total_sales' ? vaTotalSales : vaNetProfit;
      commission = base * (va.commissionRate / 100);
    } else if (va.commissionType === 'hybrid') {
      const base = va.commissionBase === 'total_sales' ? vaTotalSales : vaNetProfit;
      commission = (va.fixedSalary || 0) + base * (va.commissionRate / 100);
    }

    vaCommissions.push({ name: va.name, sales: vaTotalSales, commission });
  });

  const totalVACommission = vaCommissions.reduce((sum, v) => sum + v.commission, 0);

  // Returns and refunds
  const returnedSales = monthlySales.filter(s => s.deliveryStatus === 'returned' || s.deliveryStatus === 'refunded');
  const returnLoss = returnedSales.reduce((sum, s) => sum + Math.abs(s.netProfit), 0);

  // Final net profit
  const finalNetProfit = totalNetProfit - totalExpenses - totalVACommission;

  return {
    totalOrders,
    totalRevenue,
    totalCOGS,
    totalGrossProfit,
    totalNetProfit,
    marketplaceBreakdown,
    expenseBreakdown,
    totalExpenses,
    vaCommissions,
    totalVACommission,
    returnedOrders: returnedSales.filter(s => s.deliveryStatus === 'returned').length,
    refundedOrders: returnedSales.filter(s => s.deliveryStatus === 'refunded').length,
    returnLoss,
    finalNetProfit
  };
}

export function getYearlyData(sales: Sale[], expenses: Expense[], users: User[], year: number) {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const yearlySales = sales.filter(s => {
    const saleDate = parseISO(s.date);
    return isWithinInterval(saleDate, { start: yearStart, end: yearEnd });
  });

  const yearlyExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.date);
    return isWithinInterval(expenseDate, { start: yearStart, end: yearEnd });
  });

  const totalRevenue = yearlySales.reduce((sum, s) => sum + s.saleAmount, 0);
  const totalCOGS = yearlySales.reduce((sum, s) => sum + (s.productCost * s.quantity), 0);
  const totalGrossProfit = totalRevenue - totalCOGS;

  // Expense breakdown
  const expenseBreakdown: Record<string, number> = {};
  yearlyExpenses.forEach(e => {
    expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
  });

  const totalExpenses = yearlyExpenses.reduce((sum, e) => sum + e.amount, 0);

  // VA Commission calculation (yearly)
  let totalVACommission = 0;
  users.filter(u => u.role === 'VA' && u.status === 'active').forEach(va => {
    const vaSales = yearlySales.filter(s => s.buyingAccount === va.name || s.userId === va.id);
    const vaTotalSales = vaSales.reduce((sum, s) => sum + s.saleAmount, 0);
    const vaNetProfit = vaSales.reduce((sum, s) => sum + s.netProfit, 0);

    if (va.commissionType === 'fixed') {
      totalVACommission += (va.fixedSalary || 0) * 12;
    } else if (va.commissionType === 'percentage') {
      const base = va.commissionBase === 'total_sales' ? vaTotalSales : vaNetProfit;
      totalVACommission += base * (va.commissionRate / 100);
    } else if (va.commissionType === 'hybrid') {
      const base = va.commissionBase === 'total_sales' ? vaTotalSales : vaNetProfit;
      totalVACommission += (va.fixedSalary || 0) * 12 + base * (va.commissionRate / 100);
    }
  });

  // Returns
  const returnedSales = yearlySales.filter(s => s.deliveryStatus === 'returned' || s.deliveryStatus === 'refunded');
  const returnLoss = returnedSales.reduce((sum, s) => sum + Math.abs(s.netProfit), 0);

  // Taxable income
  const taxableIncome = totalGrossProfit - totalExpenses - totalVACommission - returnLoss;

  // Quarterly breakdown
  const quarters = [0, 1, 2, 3].map(q => {
    const qStart = new Date(year, q * 3, 1);
    const qEnd = endOfMonth(new Date(year, q * 3 + 2, 1));
    const qSales = yearlySales.filter(s => {
      const d = parseISO(s.date);
      return isWithinInterval(d, { start: qStart, end: qEnd });
    });
    return {
      quarter: q + 1,
      revenue: qSales.reduce((sum, s) => sum + s.saleAmount, 0),
      profit: qSales.reduce((sum, s) => sum + s.netProfit, 0)
    };
  });

  return {
    totalRevenue,
    totalCOGS,
    totalGrossProfit,
    expenseBreakdown,
    totalExpenses,
    totalVACommission,
    returnLoss,
    taxableIncome,
    quarters
  };
}

export function calculateTax(taxableIncome: number, state: string, ownerShare: number = 50) {
  // Owner's share of profit (default 50% - you keep 50% after VA commissions etc)
  // Tax is calculated only on the owner's portion of the net profit
  const ownerIncome = taxableIncome * (ownerShare / 100);
  
  // If no profit or loss, no tax
  if (ownerIncome <= 0) {
    return {
      ownerIncome: ownerIncome,
      ownerSharePercent: ownerShare,
      federalTax: 0,
      selfEmploymentTax: 0,
      seTaxDeduction: 0,
      stateTax: 0,
      totalTax: 0,
      effectiveRate: 0,
      afterTaxIncome: ownerIncome
    };
  }

  // Self-employment tax (15.3%) - calculated first
  // SE tax = 92.35% of net earnings * 15.3%
  const seBase = ownerIncome * 0.9235;
  const selfEmploymentTax = seBase * 0.153;
  
  // You can deduct 50% of SE tax from income for federal tax purposes
  const seTaxDeduction = selfEmploymentTax * 0.5;
  const adjustedIncome = ownerIncome - seTaxDeduction;

  // Federal tax brackets 2024
  let federalTax = 0;
  if (adjustedIncome > 0) {
    if (adjustedIncome <= 11600) {
      federalTax = adjustedIncome * 0.10;
    } else if (adjustedIncome <= 47150) {
      federalTax = 1160 + (adjustedIncome - 11600) * 0.12;
    } else if (adjustedIncome <= 100525) {
      federalTax = 5426 + (adjustedIncome - 47150) * 0.22;
    } else if (adjustedIncome <= 191950) {
      federalTax = 17168.50 + (adjustedIncome - 100525) * 0.24;
    } else if (adjustedIncome <= 243725) {
      federalTax = 39110.50 + (adjustedIncome - 191950) * 0.32;
    } else if (adjustedIncome <= 609350) {
      federalTax = 55678.50 + (adjustedIncome - 243725) * 0.35;
    } else {
      federalTax = 183647.25 + (adjustedIncome - 609350) * 0.37;
    }
  }

  // State tax
  const stateData = US_STATES.find(s => s.code === state);
  const stateRate = stateData?.rate || 0;
  const stateTax = ownerIncome > 0 ? ownerIncome * stateRate : 0;

  const totalTax = federalTax + selfEmploymentTax + stateTax;
  const effectiveRate = ownerIncome > 0 ? (totalTax / ownerIncome) * 100 : 0;
  const afterTaxIncome = ownerIncome - totalTax;

  return {
    ownerIncome,
    ownerSharePercent: ownerShare,
    federalTax,
    selfEmploymentTax,
    seTaxDeduction,
    stateTax,
    totalTax,
    effectiveRate,
    afterTaxIncome
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
