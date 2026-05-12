import React, { forwardRef, useEffect, useCallback } from 'react';
import { X, ChevronDown, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

/* ================================================
   BUTTON
   ================================================ */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const v: Record<string, string> = {
      primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-400 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400 dark:text-slate-300 dark:hover:bg-slate-700',
      outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-slate-400 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500'
    };
    const s: Record<string, string> = { xs: 'px-2.5 py-1.5 text-xs', sm: 'px-3 py-2 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' };
    return (
      <button ref={ref} className={`${base} ${v[variant]} ${s[size]} ${className}`} disabled={disabled || loading} {...props}>
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

/* ================================================
   INPUT
   ================================================ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  suffix?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, hint, suffix, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
      <div className="relative">
        <input
          ref={ref}
          className={`block w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 disabled:text-slate-500 disabled:cursor-not-allowed ${suffix ? 'pr-12' : 'pr-4'} ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'} ${className}`}
          {...props}
        />
        {suffix && <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">{suffix}</div>}
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /><span>{error}</span></p>}
      {hint && !error && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

/* ================================================
   SELECT
   ================================================ */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={`block w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white appearance-none cursor-pointer pl-4 pr-10 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 disabled:bg-slate-50 dark:disabled:bg-slate-900 ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'} ${className}`}
          {...props}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

/* ================================================
   TEXTAREA
   ================================================ */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, ...props }, ref) => (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>}
      <textarea
        ref={ref}
        className={`block w-full rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${error ? 'border-red-500' : 'border-slate-200 dark:border-slate-600'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

/* ================================================
   CARD
   ================================================ */
interface CardProps { children: React.ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; hover?: boolean; }

export const Card: React.FC<CardProps> = ({ children, className = '', padding = 'md', hover = false }) => {
  const p: Record<string, string> = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm ${hover ? 'card-hover' : ''} ${p[padding]} ${className}`}>
      {children}
    </div>
  );
};

/* ================================================
   BADGE
   ================================================ */
interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'; size?: 'sm' | 'md'; className?: string; dot?: boolean; }

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'sm', className = '', dot = false }) => {
  const v: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    primary: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  const s: Record<string, string> = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };
  const dc: Record<string, string> = { default: 'bg-slate-400', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-red-500', info: 'bg-blue-500', primary: 'bg-red-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full whitespace-nowrap ${v[variant]} ${s[size]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dc[variant]}`} />}
      {children}
    </span>
  );
};

/* ================================================
   MODAL
   ================================================ */
interface ModalProps { isOpen: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; }

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const esc = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; document.addEventListener('keydown', esc); }
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', esc); };
  }, [isOpen, esc]);
  if (!isOpen) return null;
  const sz: Record<string, string> = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${sz[size]} animate-scaleIn`} onClick={e => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
};

/* ================================================
   TOAST
   ================================================ */
interface ToastProps { message: string; type?: 'success' | 'error' | 'info' | 'warning'; onClose: () => void; }

export const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const cfg: Record<string, { bg: string; Icon: React.FC<{ className?: string }> }> = {
    success: { bg: 'bg-emerald-600', Icon: CheckCircle },
    error: { bg: 'bg-red-600', Icon: AlertCircle },
    info: { bg: 'bg-blue-600', Icon: Info },
    warning: { bg: 'bg-amber-600', Icon: AlertTriangle }
  };
  const { bg, Icon } = cfg[type];
  return (
    <div className={`fixed bottom-6 right-6 z-[99999] ${bg} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-slideIn`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80 flex-shrink-0"><X className="w-4 h-4" /></button>
    </div>
  );
};

/* ================================================
   STAT CARD
   ================================================ */
interface StatCardProps { title: string; value: string | number; change?: number; changeLabel?: string; icon?: React.ReactNode; trend?: 'up' | 'down' | 'neutral'; className?: string; }

export const StatCard: React.FC<StatCardProps> = ({ title, value, change, changeLabel, icon, trend, className = '' }) => (
  <Card className={`relative overflow-hidden ${className}`} hover>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums truncate">{value}</p>
        {change !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center text-sm font-medium ${trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''}{Math.abs(change)}%
            </span>
            {changeLabel && <span className="text-sm text-slate-400 dark:text-slate-500">{changeLabel}</span>}
          </div>
        )}
      </div>
      {icon && <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex-shrink-0">{icon}</div>}
    </div>
  </Card>
);

/* ================================================
   CONFIRM DIALOG
   ================================================ */
interface ConfirmDialogProps { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmText?: string; cancelText?: string; variant?: 'danger' | 'warning' | 'info'; }

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger' }) => (
  <Modal isOpen={isOpen} onClose={onClose} size="sm">
    <div className="text-center">
      <div className={`w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
        <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
        <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</Button>
      </div>
    </div>
  </Modal>
);

/* ================================================
   EMPTY STATE
   ================================================ */
interface EmptyStateProps { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; }

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
    {icon && <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">{icon}</div>}
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
    {description && <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">{description}</p>}
    {action}
  </div>
);

/* ================================================
   SPINNER
   ================================================ */
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const s: Record<string, string> = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return <div className={`${s[size]} animate-spin rounded-full border-2 border-slate-200 dark:border-slate-700 border-t-red-600 ${className}`} />;
};
