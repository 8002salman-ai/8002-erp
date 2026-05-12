import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from './store/useStore';
import { usePermissions } from './hooks/usePermissions';
import { VAPermissions } from './types';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Purchases from './pages/Purchases';
import Inventory from './pages/Inventory';
import Expenses from './pages/Expenses';
import VAManagement from './pages/VAManagement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Layout from './components/layout/Layout';
import AskAIFloating from './components/ai/AskAIFloating';

// Protected Route - checks auth & optional permission
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  adminOnly?: boolean;
  requireAny?: (keyof VAPermissions)[];
}> = ({ children, adminOnly = false, requireAny }) => {
  const { isAuthenticated } = useAuthStore();
  const { isAdmin, can } = usePermissions();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;

  // If requireAny is set, user needs at least one of those permissions
  if (requireAny && !isAdmin) {
    const hasAny = requireAny.some(p => can(p));
    if (!hasAny) return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { theme } = useUIStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <AskAIFloating />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

        <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />

        <Route path="/sales" element={
          <ProtectedRoute requireAny={['sales_view', 'sales_add']}>
            <Layout><Sales /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/purchases" element={
          <ProtectedRoute requireAny={['purchases_view', 'purchases_add']}>
            <Layout><Purchases /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute requireAny={['inventory_view', 'inventory_add']}>
            <Layout><Inventory /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/expenses" element={
          <ProtectedRoute requireAny={['expenses_view', 'expenses_add']}>
            <Layout><Expenses /></Layout>
          </ProtectedRoute>
        } />

        <Route path="/va-management" element={<ProtectedRoute adminOnly><Layout><VAManagement /></Layout></ProtectedRoute>} />
        <Route path="/reports" element={
          <ProtectedRoute requireAny={['reports_view']}>
            <Layout><Reports /></Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={<ProtectedRoute adminOnly><Layout><Settings /></Layout></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
