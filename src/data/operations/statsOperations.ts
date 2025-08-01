import { getSupabaseClient } from '@/lib/supabaseClient';
import { getProductDefinitions } from './productDefinitionOperations';

export const calculateDashboardStats = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("Supabase client not available, returning default stats.");
    return { totalSupplies: 0, expiringSupplies: 0, expiredSupplies: 0, reorderPointItems: 0, validSupplies: 0, typeCounts: {} };
  }

  const { data: allItems, error: allItemsError } = await supabase
    .from('inventory_items_with_status')
    .select('id, status, quantity, product_definition_id, variant');

  if (allItemsError) {
    console.error("Error fetching items for stats:", allItemsError);
    throw allItemsError;
  }

  const productDefs = await getProductDefinitions();

  const totalSupplies = allItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const expiringSupplies = allItems?.filter(i => i.status === 'expiring_soon').length || 0;
  const expiredSupplies = allItems?.filter(i => i.status === 'expired').length || 0;
  const validSupplies = allItems?.filter(i => i.status === 'valid').length || 0;

  // Calculate reorder point items
  const inventoryByProductVariant = allItems.reduce((acc, item) => {
    const key = `${item.product_definition_id}-${item.variant}`;
    acc[key] = (acc[key] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  let reorderPointItems = 0;
  for (const def of productDefs) {
    for (const variant of def.variants) {
      const key = `${def.id}-${variant.name}`;
      const currentStock = inventoryByProductVariant[key] || 0;
      if (currentStock > 0 && currentStock <= variant.reorder_point) {
        reorderPointItems++;
      }
    }
  }

  // Calculate type counts
  const typeCounts = allItems.reduce((acc, item) => {
    const def = productDefs.find(p => p.id === item.product_definition_id);
    if (def) {
      // This assumes a mapping from type_id to a type name/key.
      // As we don't have the supply_types table joined here, this is a simplification.
      // A proper implementation would join supply_types or use an RPC function.
      const typeKey = def.type_id; // Using type_id as a placeholder key
      acc[typeKey] = (acc[typeKey] || 0) + item.quantity;
    }
    return acc;
  }, {} as Record<string, number>);


  return {
    totalSupplies,
    expiringSupplies,
    expiredSupplies,
    reorderPointItems,
    validSupplies,
    typeCounts,
  };
};
