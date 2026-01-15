
import { useAuth } from '@/contexts/AuthContext';

type Permission =
    | 'view_price'
    | 'manage_inventory'
    | 'manage_users'
    | 'manage_packages'
    | 'view_reports_financial';

export const usePermission = () => {
    const { user } = useAuth();
    const role = user?.profile?.role || 'user'; // 'admin' | 'user' (operational)

    const isOps = role === 'user';
    const isAdmin = role === 'admin';

    const check = (permission: Permission): boolean => {
        switch (permission) {
            case 'view_price':
            case 'view_reports_financial':
            case 'manage_users':
            case 'manage_packages':
                return isAdmin; // Strict Admin Only

            case 'manage_inventory':
                return isAdmin; // Ops can only Consume/Transfer, not Create/Delete base items

            default:
                return false;
        }
    };

    return {
        role,
        isAdmin,
        isOps,
        can: check,
        // Shortcuts for common checks
        canViewPrices: check('view_price'),
        canManagePackages: check('manage_packages'),
    };
};
