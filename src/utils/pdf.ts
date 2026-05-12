import jsPDF from 'jspdf';
import { Sale, Settings } from '../types';
import { format } from 'date-fns';
import { formatCurrency } from './calculations';

export function generateSaleInvoice(sale: Sale, settings: Settings): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (settings.businessAddress) {
    doc.text(settings.businessAddress, pageWidth / 2, 32, { align: 'center' });
  }
  if (settings.businessPhone || settings.businessEmail) {
    doc.text(`${settings.businessPhone || ''} | ${settings.businessEmail || ''}`, pageWidth / 2, 38, { align: 'center' });
  }
  
  // Line
  doc.setLineWidth(0.5);
  doc.line(20, 45, pageWidth - 20, 45);
  
  // Invoice title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 58);
  
  // Invoice details
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice #: INV-${sale.id.slice(0, 8).toUpperCase()}`, 20, 68);
  doc.text(`Date: ${format(new Date(sale.date), 'MMM dd, yyyy')}`, 20, 74);
  doc.text(`Order #: ${sale.orderNumber}`, 20, 80);
  
  // Bill To
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 20, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(sale.customerName, 20, 103);
  if (sale.customerAddress) {
    const addressLines = doc.splitTextToSize(sale.customerAddress, 80);
    doc.text(addressLines, 20, 110);
  }
  
  // Shipping info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIPPING INFORMATION:', pageWidth - 90, 95);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (sale.trackingNumber) {
    doc.text(`Tracking #: ${sale.trackingNumber}`, pageWidth - 90, 103);
  }
  doc.text(`Status: ${sale.deliveryStatus.charAt(0).toUpperCase() + sale.deliveryStatus.slice(1)}`, pageWidth - 90, 110);
  doc.text(`Marketplace: ${sale.marketplace}`, pageWidth - 90, 117);
  
  // Items table
  const tableTop = 135;
  doc.setFillColor(59, 130, 246);
  doc.rect(20, tableTop, pageWidth - 40, 10, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('Product', 25, tableTop + 7);
  doc.text('Qty', 120, tableTop + 7);
  doc.text('Price', 145, tableTop + 7);
  doc.text('Total', 175, tableTop + 7);
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text(sale.productName, 25, tableTop + 17);
  doc.text(sale.quantity.toString(), 120, tableTop + 17);
  doc.text(formatCurrency(sale.saleAmount / sale.quantity), 145, tableTop + 17);
  doc.text(formatCurrency(sale.saleAmount), 175, tableTop + 17);
  
  // Totals
  const totalsTop = tableTop + 35;
  doc.line(20, totalsTop - 5, pageWidth - 20, totalsTop - 5);
  
  doc.text('Subtotal:', 140, totalsTop + 5);
  doc.text(formatCurrency(sale.saleAmount), 175, totalsTop + 5);
  
  doc.text('Marketplace Fee:', 140, totalsTop + 12);
  doc.text(formatCurrency(sale.marketplaceFee), 175, totalsTop + 12);
  
  doc.text('Shipping:', 140, totalsTop + 19);
  doc.text(formatCurrency(sale.shippingCost), 175, totalsTop + 19);
  
  doc.setLineWidth(1);
  doc.line(140, totalsTop + 25, pageWidth - 20, totalsTop + 25);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 140, totalsTop + 33);
  doc.text(formatCurrency(sale.saleAmount), 175, totalsTop + 33);
  
  // Tax Information Box
  const taxBoxTop = totalsTop + 50;
  doc.setFillColor(249, 250, 251);
  doc.rect(20, taxBoxTop, pageWidth - 40, 35, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(20, taxBoxTop, pageWidth - 40, 35, 'S');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(55, 65, 81);
  doc.text('TAX INFORMATION', 25, taxBoxTop + 8);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Business: ' + settings.businessName, 25, taxBoxTop + 16);
  doc.text('Structure: ' + (settings.businessStructure || 'LLC').toUpperCase(), 25, taxBoxTop + 22);
  doc.text('State: ' + (settings.state || 'N/A'), 25, taxBoxTop + 28);
  
  doc.text('This sale is subject to applicable sales tax.', pageWidth - 95, taxBoxTop + 16);
  doc.text('Tax ID/EIN available upon request.', pageWidth - 95, taxBoxTop + 22);
  doc.text('Invoice generated: ' + format(new Date(), 'MMM dd, yyyy'), pageWidth - 95, taxBoxTop + 28);
  
  doc.setTextColor(0, 0, 0);
  
  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('Thank you for your business!', pageWidth / 2, 260, { align: 'center' });
  
  // Legal footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('This invoice is computer generated and is valid without signature.', pageWidth / 2, 270, { align: 'center' });
  doc.text(`${settings.businessName} | ${settings.businessEmail || ''}`, pageWidth / 2, 276, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  
  // Save
  doc.save(`Invoice_${sale.orderNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`);
}

export function generateMonthlyReport(
  monthData: {
    totalOrders: number;
    totalRevenue: number;
    totalCOGS: number;
    totalGrossProfit: number;
    totalNetProfit: number;
    marketplaceBreakdown: Record<string, number>;
    expenseBreakdown: Record<string, number>;
    totalExpenses: number;
    vaCommissions: { name: string; sales: number; commission: number }[];
    totalVACommission: number;
    returnedOrders: number;
    refundedOrders: number;
    returnLoss: number;
    finalNetProfit: number;
  },
  month: Date,
  settings: Settings
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(16);
  doc.text('MONTHLY BUSINESS REPORT', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(format(month, 'MMMM yyyy'), pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Sales Summary
  doc.setFillColor(59, 130, 246);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SALES SUMMARY', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total Orders: ${monthData.totalOrders}`, 25, y);
  y += 6;
  doc.text(`Total Revenue: ${formatCurrency(monthData.totalRevenue)}`, 25, y);
  y += 6;
  doc.text(`Total Cost of Goods (COG): ${formatCurrency(monthData.totalCOGS)}`, 25, y);
  y += 6;
  doc.text(`Gross Profit: ${formatCurrency(monthData.totalGrossProfit)}`, 25, y);
  y += 12;
  
  // Marketplace Breakdown
  doc.setFillColor(139, 92, 246);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('MARKETPLACE BREAKDOWN', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  Object.entries(monthData.marketplaceBreakdown).forEach(([mp, amount]) => {
    const pct = monthData.totalRevenue > 0 ? (amount / monthData.totalRevenue * 100).toFixed(1) : '0';
    doc.text(`${mp}: ${formatCurrency(amount)} (${pct}%)`, 25, y);
    y += 6;
  });
  y += 6;
  
  // Expenses
  doc.setFillColor(239, 68, 68);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPENSES', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  Object.entries(monthData.expenseBreakdown).forEach(([cat, amount]) => {
    doc.text(`${cat}: ${formatCurrency(amount)}`, 25, y);
    y += 6;
  });
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Operating Expenses: ${formatCurrency(monthData.totalExpenses)}`, 25, y);
  y += 12;
  
  // VA Payroll
  if (monthData.vaCommissions.length > 0) {
    doc.setFillColor(16, 185, 129);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('VA PAYROLL', 25, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 15;
    
    doc.setFont('helvetica', 'normal');
    monthData.vaCommissions.forEach(va => {
      doc.text(`${va.name}: Sales ${formatCurrency(va.sales)} → Commission ${formatCurrency(va.commission)}`, 25, y);
      y += 6;
    });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total VA Commission: ${formatCurrency(monthData.totalVACommission)}`, 25, y);
    y += 12;
  }
  
  // Returns
  if (monthData.returnedOrders > 0 || monthData.refundedOrders > 0) {
    doc.setFillColor(245, 158, 11);
    doc.rect(20, y, pageWidth - 40, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('RETURNS & REFUNDS', 25, y + 6);
    doc.setTextColor(0, 0, 0);
    y += 15;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Returned Orders: ${monthData.returnedOrders}`, 25, y);
    y += 6;
    doc.text(`Refunded Orders: ${monthData.refundedOrders}`, 25, y);
    y += 6;
    doc.setTextColor(239, 68, 68);
    doc.text(`Total Loss: -${formatCurrency(monthData.returnLoss)}`, 25, y);
    doc.setTextColor(0, 0, 0);
    y += 12;
  }
  
  // Net Profit
  doc.setFillColor(30, 41, 59);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PROFIT CALCULATION', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Gross Revenue: ${formatCurrency(monthData.totalRevenue)}`, 25, y);
  y += 6;
  doc.text(`- Cost of Goods: -${formatCurrency(monthData.totalCOGS)}`, 25, y);
  y += 6;
  doc.text(`- Operating Expenses: -${formatCurrency(monthData.totalExpenses)}`, 25, y);
  y += 6;
  doc.text(`- VA Commissions: -${formatCurrency(monthData.totalVACommission)}`, 25, y);
  y += 6;
  doc.text(`- Returns/Refunds: -${formatCurrency(monthData.returnLoss)}`, 25, y);
  y += 8;
  
  doc.setLineWidth(0.5);
  doc.line(25, y, 100, y);
  y += 6;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const profitColor = monthData.finalNetProfit >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.text(`NET PROFIT: ${formatCurrency(monthData.finalNetProfit)}`, 25, y);
  doc.setTextColor(0, 0, 0);
  
  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth / 2, 280, { align: 'center' });
  
  doc.save(`${settings.businessName.replace(/\s+/g, '_')}_Monthly_Report_${format(month, 'yyyy_MM')}.pdf`);
}

export function generateCPAReport(
  yearData: {
    totalRevenue: number;
    totalCOGS: number;
    totalGrossProfit: number;
    expenseBreakdown: Record<string, number>;
    totalExpenses: number;
    totalVACommission: number;
    returnLoss: number;
    taxableIncome: number;
    quarters: { quarter: number; revenue: number; profit: number }[];
  },
  taxData: {
    ownerIncome: number;
    ownerSharePercent: number;
    federalTax: number;
    selfEmploymentTax: number;
    seTaxDeduction: number;
    stateTax: number;
    totalTax: number;
    effectiveRate: number;
    afterTaxIncome: number;
  },
  year: number,
  settings: Settings
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;
  
  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.businessName, pageWidth / 2, y, { align: 'center' });
  y += 10;
  
  doc.setFontSize(16);
  doc.text('ANNUAL TAX REPORT FOR CPA', pageWidth / 2, y, { align: 'center' });
  y += 8;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tax Year: ${year}`, pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  // Income Summary
  doc.setFillColor(59, 130, 246);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ANNUAL INCOME SUMMARY', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Gross Revenue: ${formatCurrency(yearData.totalRevenue)}`, 25, y);
  y += 6;
  doc.text(`Cost of Goods Sold (COGS): -${formatCurrency(yearData.totalCOGS)}`, 25, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Gross Profit: ${formatCurrency(yearData.totalGrossProfit)}`, 25, y);
  y += 12;
  
  // Expenses
  doc.setFillColor(239, 68, 68);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('BUSINESS EXPENSES (Tax Deductible)', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  Object.entries(yearData.expenseBreakdown).forEach(([cat, amount]) => {
    doc.text(`${cat}: ${formatCurrency(amount)}`, 25, y);
    y += 6;
  });
  if (yearData.totalVACommission > 0) {
    doc.text(`VA Payroll/Commissions: ${formatCurrency(yearData.totalVACommission)}`, 25, y);
    y += 6;
  }
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Deductible Expenses: ${formatCurrency(yearData.totalExpenses + yearData.totalVACommission)}`, 25, y);
  y += 12;
  
  // Net Taxable Income
  doc.setFillColor(16, 185, 129);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('NET TAXABLE INCOME', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Gross Profit: ${formatCurrency(yearData.totalGrossProfit)}`, 25, y);
  y += 6;
  doc.text(`- Total Expenses: -${formatCurrency(yearData.totalExpenses + yearData.totalVACommission)}`, 25, y);
  y += 6;
  doc.text(`- Returns/Refunds: -${formatCurrency(yearData.returnLoss)}`, 25, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Net Taxable Income: ${formatCurrency(yearData.taxableIncome)}`, 25, y);
  y += 12;
  
  // Tax Estimation
  doc.setFillColor(139, 92, 246);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ESTIMATED TAX LIABILITY (LLC)', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Owner's Share (${taxData.ownerSharePercent}%): ${formatCurrency(taxData.ownerIncome)}`, 25, y);
  y += 6;
  doc.text(`SE Tax Deduction (50%): -${formatCurrency(taxData.seTaxDeduction)}`, 25, y);
  y += 6;
  doc.text(`Federal Income Tax (est.): ${formatCurrency(taxData.federalTax)}`, 25, y);
  y += 6;
  doc.text(`Self-Employment Tax (15.3%): ${formatCurrency(taxData.selfEmploymentTax)}`, 25, y);
  y += 6;
  doc.text(`State Tax (${settings.state}): ${formatCurrency(taxData.stateTax)}`, 25, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Estimated Tax: ${formatCurrency(taxData.totalTax)}`, 25, y);
  y += 6;
  doc.text(`Effective Tax Rate: ${taxData.effectiveRate.toFixed(1)}%`, 25, y);
  y += 6;
  doc.text(`After-Tax Income: ${formatCurrency(taxData.afterTaxIncome)}`, 25, y);
  y += 12;
  
  // Quarterly Breakdown
  doc.setFillColor(245, 158, 11);
  doc.rect(20, y, pageWidth - 40, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('QUARTERLY BREAKDOWN', 25, y + 6);
  doc.setTextColor(0, 0, 0);
  y += 15;
  
  doc.setFont('helvetica', 'normal');
  yearData.quarters.forEach(q => {
    doc.text(`Q${q.quarter} (${['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'][q.quarter - 1]}): Revenue: ${formatCurrency(q.revenue)} | Profit: ${formatCurrency(q.profit)}`, 25, y);
    y += 6;
  });
  y += 6;
  
  // Notes
  doc.setFont('helvetica', 'bold');
  doc.text('NOTES FOR CPA:', 25, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('- All expenses are business-related', 25, y);
  y += 5;
  doc.text('- VA workers are contractors (1099)', 25, y);
  y += 5;
  doc.text(`- Business Structure: ${settings.businessStructure.toUpperCase()}`, 25, y);
  
  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('This report is for tax preparation purposes.', pageWidth / 2, 275, { align: 'center' });
  doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy')}`, pageWidth / 2, 282, { align: 'center' });
  
  doc.save(`${settings.businessName.replace(/\s+/g, '_')}_Tax_Report_${year}_CPA.pdf`);
}
