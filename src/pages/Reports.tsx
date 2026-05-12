import React, { useState, useMemo } from 'react';
import { format, subMonths } from 'date-fns';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Info, BarChart3, Receipt } from 'lucide-react';
import { useDataStore } from '../store/useStore';
import { Button, Card, Select, Badge } from '../components/ui';
import { formatCurrency, getMonthlyData, getYearlyData, calculateTax } from '../utils/calculations';
import { generateMonthlyReport, generateCPAReport } from '../utils/pdf';

const Reports: React.FC = () => {
  const { sales, expenses, users, settings } = useDataStore();
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(currentDate, 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [ownerShare, setOwnerShare] = useState(50);
  
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 24; i++) {
      const date = subMonths(currentDate, i);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy')
      });
    }
    return options;
  }, []);
  
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = 0; i < 5; i++) {
      years.push({
        value: currentDate.getFullYear() - i,
        label: `${currentDate.getFullYear() - i}`
      });
    }
    return years;
  }, []);
  
  const monthlyData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return getMonthlyData(sales, expenses, users, date);
  }, [selectedMonth, sales, expenses, users]);
  
  const yearlyData = useMemo(() => {
    return getYearlyData(sales, expenses, users, selectedYear);
  }, [selectedYear, sales, expenses, users]);
  
  const taxData = useMemo(() => {
    return calculateTax(yearlyData.taxableIncome, settings.state, ownerShare);
  }, [yearlyData, settings.state, ownerShare]);
  
  const handleDownloadMonthlyReport = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    generateMonthlyReport(monthlyData, date, settings);
  };
  
  const handleDownloadCPAReport = () => {
    generateCPAReport(yearlyData, taxData, selectedYear, settings);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Generate and download business reports
        </p>
      </div>
      
      {/* Monthly Report */}
      <Card>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Monthly Report</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Complete monthly business summary</p>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={monthOptions}
              className="w-44"
            />
            <Button onClick={handleDownloadMonthlyReport}>
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-500">Revenue</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(monthlyData.totalRevenue)}
            </p>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              {monthlyData.finalNetProfit >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm text-slate-500">Net Profit</span>
            </div>
            <p className={`text-xl font-bold tabular-nums ${
              monthlyData.finalNetProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {formatCurrency(monthlyData.finalNetProfit)}
            </p>
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-red-500" />
              <span className="text-sm text-slate-500">Expenses</span>
            </div>
            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(monthlyData.totalExpenses)}
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-slate-500">VA Commission</span>
            </div>
            <p className="text-xl font-bold text-purple-600 tabular-nums">
              {formatCurrency(monthlyData.totalVACommission)}
            </p>
          </div>
        </div>
        
        {/* Marketplace Breakdown */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-slate-500 mr-2">By Marketplace:</span>
          {Object.entries(monthlyData.marketplaceBreakdown).map(([mp, amount]) => (
            <Badge key={mp} variant="info">
              {mp}: {formatCurrency(amount)}
            </Badge>
          ))}
          {Object.keys(monthlyData.marketplaceBreakdown).length === 0 && (
            <span className="text-sm text-slate-400">No sales this month</span>
          )}
        </div>
        
        {/* VA Commission Detail */}
        {monthlyData.vaCommissions.length > 0 && (
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-300 mb-3">
              VA Commission Breakdown
            </h4>
            <div className="space-y-2">
              {monthlyData.vaCommissions.map((va, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{va.name}</span>
                  <span className="text-purple-700 dark:text-purple-300 tabular-nums">
                    Sales: {formatCurrency(va.sales)} → {formatCurrency(va.commission)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {/* Annual Tax Report */}
      <Card>
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <FileText className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">CPA Tax Report</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Annual tax summary for your accountant</p>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Year:</span>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              options={yearOptions.map(y => ({ value: String(y.value), label: y.label }))}
              className="w-28"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Your Profit Share:</span>
            <select
              value={ownerShare}
              onChange={(e) => setOwnerShare(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
            >
              <option value={100}>100%</option>
              <option value={75}>75%</option>
              <option value={50}>50%</option>
              <option value={25}>25%</option>
            </select>
          </div>
          <Button variant="outline" onClick={handleDownloadCPAReport}>
            <Download className="w-4 h-4" />
            Download Tax Report
          </Button>
        </div>
        
        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Tax Calculation ({ownerShare}% Share)</p>
            <p>Tax is calculated on your portion of net profit after all deductions.</p>
          </div>
        </div>
        
        {/* Yearly Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Gross Revenue</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(yearlyData.totalRevenue)}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">COGS</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(yearlyData.totalCOGS)}</p>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Gross Profit</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(yearlyData.totalGrossProfit)}</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Total Expenses</p>
            <p className="text-xl font-bold text-red-600 tabular-nums">-{formatCurrency(yearlyData.totalExpenses)}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">VA Commissions</p>
            <p className="text-xl font-bold text-purple-600 tabular-nums">-{formatCurrency(yearlyData.totalVACommission)}</p>
          </div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
            <p className="text-sm text-slate-500 mb-1">Net Profit</p>
            <p className={`text-xl font-bold tabular-nums ${yearlyData.taxableIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(yearlyData.taxableIncome)}
            </p>
          </div>
        </div>
        
        {/* Your Taxable Income */}
        <div className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Your Taxable Amount ({ownerShare}% Share)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-500">Total Net Profit</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white tabular-nums">{formatCurrency(yearlyData.taxableIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Your Share ({ownerShare}%)</p>
              <p className="text-lg font-bold text-blue-600 tabular-nums">{formatCurrency(taxData.ownerIncome)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">SE Tax Deduction</p>
              <p className="text-lg font-bold text-emerald-600 tabular-nums">-{formatCurrency(taxData.seTaxDeduction)}</p>
            </div>
          </div>
        </div>
        
        {/* Tax Estimation */}
        <div className="p-5 bg-slate-900 dark:bg-slate-950 rounded-xl text-white">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider">Estimated Tax Liability (2024)</h3>
          
          {taxData.ownerIncome <= 0 ? (
            <div className="p-4 bg-emerald-500/20 rounded-lg text-center">
              <p className="text-emerald-300 font-medium">No tax due - Operating at loss</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Federal Tax</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(taxData.federalTax)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Self-Employment</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(taxData.selfEmploymentTax)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">State Tax ({settings.state})</p>
                  <p className="text-lg font-bold tabular-nums">{formatCurrency(taxData.stateTax)}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <p className="text-xs text-slate-400 mb-1">Total Estimated</p>
                  <p className="text-xl font-bold text-red-400 tabular-nums">{formatCurrency(taxData.totalTax)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-xs text-slate-400">Effective Tax Rate</p>
                  <p className="text-lg font-bold text-amber-400">{taxData.effectiveRate.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">After-Tax Income</p>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">{formatCurrency(taxData.afterTaxIncome)}</p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Quarterly Breakdown */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Quarterly Breakdown</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {yearlyData.quarters.map((q) => (
              <div key={q.quarter} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Q{q.quarter} ({['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'][q.quarter - 1]})</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white tabular-nums">Rev: {formatCurrency(q.revenue)}</p>
                <p className={`text-sm font-bold tabular-nums ${q.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  Profit: {formatCurrency(q.profit)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
