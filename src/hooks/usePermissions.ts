import { useAuthStore } from '../store/useStore';
import { VAPermissions, DEFAULT_VA_PERMISSIONS } from '../types';

/**
 * Hook to check current user's permissions.
 * Admin always has full access.
 * VA access is determined by their permissions object.
 */
export function usePermissions() {
  const { currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Admin gets everything
  if (isAdmin) {
    const allTrue: VAPermissions = {
      sales_view: true, sales_add: true, sales_edit: true, sales_delete: true,
      sales_export: true, sales_invoice: true,
      purchases_view: true, purchases_add: true, purchases_edit: true, purchases_delete: true,
      inventory_view: true, inventory_add: true, inventory_edit: true,
      expenses_view: true, expenses_add: true, expenses_edit: true, expenses_delete: true,
      reports_view: true, reports_download: true,
      dashboard_profit: true, dashboard_charts: true,
    };
    return { isAdmin: true, permissions: allTrue, can: (_key: keyof VAPermissions) => true };
  }

  // VA gets their stored permissions, falling back to defaults
  const permissions: VAPermissions = currentUser?.permissions
    ? { ...DEFAULT_VA_PERMISSIONS, ...currentUser.permissions }
    : { ...DEFAULT_VA_PERMISSIONS };

  const can = (key: keyof VAPermissions): boolean => {
    return permissions[key] === true;
  };

  return { isAdmin: false, permissions, can };
}
