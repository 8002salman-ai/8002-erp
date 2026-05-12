import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, X } from 'lucide-react';
import { useDataStore } from '../../store/useStore';
import { Button, Toast } from '../ui';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const formatCurrency = (amount: number) => {
  if (!Number.isFinite(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const uniqueTop = (items: string[], limit: number) => {
  return Array.from(new Set(items.map(v => (v || '').trim()).filter(Boolean))).slice(0, limit);
};

const Infinity8002Icon: React.FC<{ compact?: boolean; showAsk?: boolean }> = ({ compact = false, showAsk = false }) => (
  <div className={`relative overflow-hidden rounded-full ${compact ? 'w-9 h-9' : 'w-14 h-14'} bg-gradient-to-br from-red-700 via-red-600 to-rose-700 flex items-center justify-center shadow-[0_12px_28px_rgba(220,38,38,0.5)] border border-red-300/50`}>
    <div className="absolute inset-[1px] rounded-full border border-white/15" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.38),transparent_58%)]" />
    <div className={`relative text-white font-black tracking-tight flex items-center ${compact ? 'text-[10px]' : 'text-[14px]'}`}>
      <span className="leading-none">8</span>
      <span className={`${compact ? 'text-[18px]' : 'text-[26px]'} leading-none -mx-[1px] text-white`}>∞</span>
      <span className="leading-none">2</span>
    </div>
    {showAsk && (
      <span className="absolute bottom-[7px] text-[8px] leading-none font-bold tracking-[0.18em] text-white/95">
        ASK
      </span>
    )}
  </div>
);

const AskAIFloating: React.FC = () => {
  const location = useLocation();
  const { settings, sales, purchases, expenses, users, inventory } = useDataStore();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! Ask me anything about sales, buying, customers, inventory, or reports.',
    },
  ]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const aiKey = (settings.aiApiKey || (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined) || '').trim();

  if (location.pathname === '/login') return null;

  const summaryContext = useMemo(() => {
    const totalSales = sales.reduce((sum, s) => sum + (s.saleAmount || 0), 0);
    const totalNetProfit = sales.reduce((sum, s) => sum + (s.netProfit || 0), 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + (p.totalPurchaseCost || p.totalCost || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const salesCount = sales.length;
    const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

    const topCustomers = uniqueTop(sales.map(s => s.customerName), 12);
    const topSuppliers = uniqueTop(purchases.map(p => p.supplier), 12);
    const topProducts = uniqueTop(
      [
        ...sales.map(s => s.productName),
        ...purchases.map(p => p.productName),
        ...inventory.map(i => i.productName),
      ],
      18
    );

    const lowStockItems = inventory
      .filter(i => i.currentStock <= i.lowStockThreshold)
      .slice(0, 10)
      .map(i => `${i.productName} (${i.currentStock})`);

    return {
      businessName: settings.businessName,
      totalSalesCount: salesCount,
      totalPurchasesCount: purchases.length,
      totalExpensesCount: expenses.length,
      totalInventoryItems: inventory.length,
      totalTeamMembers: users.length,
      // Raw numeric values for exact answers
      totalSalesAmountRaw: Number(totalSales.toFixed(2)),
      totalPurchasesAmountRaw: Number(totalPurchases.toFixed(2)),
      totalExpensesAmountRaw: Number(totalExpenses.toFixed(2)),
      totalNetProfitRaw: Number(totalNetProfit.toFixed(2)),
      averageSaleAmountRaw: Number(averageSale.toFixed(2)),
      totalSalesAmount: formatCurrency(totalSales),
      totalPurchasesAmount: formatCurrency(totalPurchases),
      totalExpensesAmount: formatCurrency(totalExpenses),
      totalNetProfit: formatCurrency(totalNetProfit),
      customers: topCustomers,
      suppliers: topSuppliers,
      products: topProducts,
      lowStockItems,
      recentSales: sales.slice(-8).map(s => ({
        date: s.date,
        customer: s.customerName,
        product: s.productName,
        amount: Number((s.saleAmount || 0).toFixed(2)),
        netProfit: Number((s.netProfit || 0).toFixed(2)),
      })),
      recentPurchases: purchases.slice(-8).map(p => ({
        date: p.date,
        supplier: p.supplier,
        product: p.productName,
        totalCost: Number((p.totalPurchaseCost || p.totalCost || 0).toFixed(2)),
      })),
    };
  }, [settings.businessName, sales, purchases, expenses, inventory, users.length]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;
    if (!aiKey) {
      setToast({ message: 'AI API key missing. Please add it in Settings > AI Assistant.', type: 'error' });
      return;
    }

    const userMessage: ChatMessage = { id: `${Date.now()}-u`, role: 'user', text: question };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': '8002 ERP Accounting System',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          temperature: 0.1,
          max_tokens: 140,
          messages: [
            {
              role: 'system',
              content:
                'You are a practical ERP assistant for 8002 ERP. Default response language is English. Understand user input in any language (including Urdu/Hindi/Roman Urdu) and only switch language when explicitly requested. Keep every reply very short and to the point (ideally 1-3 short lines or bullets). Avoid long explanations. For sales questions, always provide exact figures from provided context (no estimates/invention). If there are zero sales, reply exactly: "No sales recorded yet." If data is missing, ask only the minimum needed follow-up.',
            },
            {
              role: 'system',
              content: `Business context:\n${JSON.stringify(summaryContext, null, 2)}`,
            },
            ...messages.slice(-8).map(m => ({ role: m.role, content: m.text })),
            { role: 'user', content: question },
          ],
        }),
      });

      if (!response.ok) {
        let detail = '';
        try {
          const errPayload = (await response.json()) as { error?: { message?: string } };
          detail = errPayload.error?.message || '';
        } catch {
          detail = await response.text();
        }
        throw new Error(detail || `AI request failed (${response.status})`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
      };
      const raw = payload.choices?.[0]?.message?.content;
      const text =
        typeof raw === 'string'
          ? raw
          : Array.isArray(raw)
            ? raw
                .filter(part => part?.type === 'text' && typeof part.text === 'string')
                .map(part => part.text as string)
                .join('\n')
            : '';

      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: 'assistant',
          text: (text || 'AI did not return a response. Please try again.').trim(),
        },
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed';
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: 'assistant',
          text: `Error: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-slate-900/95 border border-red-400/40 text-white shadow-[0_16px_40px_rgba(220,38,38,0.35)] flex items-center justify-center transition-all hover:scale-[1.02]"
        title="Ask"
      >
        {isOpen ? (
          <X className="w-5 h-5" />
        ) : (
          <Infinity8002Icon showAsk />
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-22 right-6 z-[9998] w-[280px] sm:w-[300px] max-w-[calc(100vw-0.75rem)] h-[360px] sm:h-[390px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Infinity8002Icon compact />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Ask</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Quick business help</p>
              </div>
            </div>
            {!aiKey && <span className="text-[11px] text-amber-700 bg-amber-100 px-2 py-1 rounded-full">API Key Missing</span>}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-xl px-2.5 py-1.5 text-[13px] whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-xl px-2.5 py-1.5 text-[13px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 border-t border-slate-200 dark:border-slate-700">
            <div className="flex gap-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about sales, buying, clients..."
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-2.5 py-1.5 text-[13px] outline-none focus:ring-2 focus:ring-red-500/30"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <Button onClick={() => void sendMessage()} loading={loading} size="sm">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default AskAIFloating;
