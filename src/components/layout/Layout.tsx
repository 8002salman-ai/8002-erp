import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, Package, DollarSign, Users, FileText, Settings,
  Menu, X, Sun, Moon, LogOut, ChevronLeft, ChevronRight, Boxes, ArrowLeft
} from 'lucide-react';
import { useAuthStore, useUIStore, useDataStore } from '../../store/useStore';
import { usePermissions } from '../../hooks/usePermissions';

interface LayoutProps { children: React.ReactNode; }

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { settings } = useDataStore();
  const { isAdmin, can } = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setIsMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Check if we can go back (not on dashboard)
  const canGoBack = location.pathname !== '/';
  const handleBack = () => { navigate(-1); };

  // Nav items based on permissions
  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { path: '/sales', label: 'Sales', icon: TrendingUp, show: can('sales_view') || can('sales_add') },
    { path: '/purchases', label: 'Buying', icon: Package, show: isAdmin || can('purchases_view') || can('purchases_add') },
    { path: '/inventory', label: 'Inventory', icon: Boxes, show: isAdmin || can('inventory_view') || can('inventory_add') },
    { path: '/expenses', label: 'Expenses', icon: DollarSign, show: isAdmin || can('expenses_view') || can('expenses_add') },
    { path: '/va-management', label: 'Team', icon: Users, show: isAdmin },
    { path: '/reports', label: 'Reports', icon: FileText, show: isAdmin || can('reports_view') },
    { path: '/settings', label: 'Settings', icon: Settings, show: isAdmin }
  ].filter(item => item.show);

  // Handle nav click - close mobile menu immediately
  const handleNavClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Mobile Overlay */}
      {isMobileOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setIsMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-screen bg-slate-900 border-r border-slate-800 transition-all duration-300 ${isCollapsed ? 'w-[72px]' : 'w-64'} ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center h-16 px-4 border-b border-slate-800 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed ? (
              <Link to="/" onClick={handleNavClick} className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="text-white font-bold text-lg truncate">{settings.businessName.split(' ')[0]}</span>
                  <span className="text-red-500 font-bold text-lg flex-shrink-0">LLC</span>
                </div>
              </Link>
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
            )}
            <button onClick={() => setIsMobileOpen(false)} className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
            {!isCollapsed && <p className="px-3 mb-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menu</p>}
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleNavClick}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium text-sm truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Collapse Toggle (desktop only) */}
          <div className="hidden lg:block px-3 py-2 border-t border-slate-800">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /><span className="text-sm font-medium">Collapse</span></>}
            </button>
          </div>

          {/* User Info */}
          <div className={`p-3 border-t border-slate-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? '' : 'p-2 bg-slate-800/50 rounded-lg'}`}>
              <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentUser?.role === 'ADMIN' ? 'Administrator' : 'Team Member'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
          <div className="flex items-center justify-between h-full px-4 lg:px-8 gap-4">
            {/* Left: Hamburger + Back + Title */}
            <div className="flex items-center gap-2 min-w-0">
              {/* Mobile hamburger */}
              <button onClick={() => setIsMobileOpen(true)} className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex-shrink-0">
                <Menu className="w-5 h-5" />
              </button>

              {/* Back button - shows on all pages except Dashboard */}
              {canGoBack && (
                <button
                  onClick={handleBack}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              {/* Page title */}
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
              </h1>
            </div>

            {/* Right: Theme + User */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={toggleTheme} className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}>
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <div className="flex items-center gap-3 pl-3 ml-2 border-l border-slate-200 dark:border-slate-700">
                <div className="hidden sm:block text-right min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{currentUser?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{currentUser?.email}</p>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
