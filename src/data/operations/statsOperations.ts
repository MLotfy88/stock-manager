import { getSupabaseClient } from '@/lib/supabaseClient';
import { InventoryItem } from '@/types';
import { getSoonToExpireItems, getExpiredItems } from './suppliesOperations';

export const calculateDashboardStats = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("Supabase client not available, returning default stats.");
    return { totalSupplies: 0, expiringSupplies: 0, expiredSupplies: 0, validSupplies: 0, typeCounts: {} };
  }

  // Note: These operations can be slow if the table is large.
  // In a production app, you might use database views or functions for this.

  const { data: allItems, error: allItemsError } = await supabase
    .from('inventory_items')
    .select('id, status, quantity');

  if (allItemsError) {
    console.error("Error fetching items for stats:", allItemsError);
    throw allItemsError;
  }

  const totalSupplies = allItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const expiringSupplies = allItems?.filter(i => i.status === 'expiring_soon').length || 0;
  const expiredSupplies = allItems?.filter(i => i.status === 'expired').length || 0;
  const validSupplies = allItems?.filter(i => i.status === 'valid').length || 0;

  // This is a simplified version. A full implementation would join tables.
  const { data: typeCountsData, error: typeCountsError } = await supabase
    .rpc('get_type_counts'); // Assuming a DB function 'get_type_counts' exists

  if (typeCountsError) {
    console.error("Error fetching type counts:", typeCountsError);
    // Return partial data if this part fails
  }

  return {
    totalSupplies,
    expiringSupplies,
    expiredSupplies,
    validSupplies,
    typeCounts: typeCountsData || {},
  };
};
