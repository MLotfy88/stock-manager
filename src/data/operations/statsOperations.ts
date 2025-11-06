import { getSupabaseClient } from '@/lib/supabaseClient';
import { getProductDefinitions } from './productDefinitionOperations';
import { getSupplyTypes } from './supplyTypeOperations';
import { RecentActivity } from '@/types';

export const calculateDashboardStats = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log("Supabase client not available, returning default stats.");
    return { totalSupplies: 0, expiringSupplies: 0, expiredSupplies: 0, reorderPointItems: 0, validSupplies: 0, typeCounts: {} };
  }

  const { data: allItems, error: allItemsError } = await supabase
    .from('inventory_items_with_status')
    .select('id, status, quantity, product_definition_id, variant')
    .gt('quantity', 0); // Only fetch items with quantity > 0

  if (allItemsError) {
    console.error("Error fetching items for stats:", allItemsError);
    throw allItemsError;
  }

  const productDefs = await getProductDefinitions();
  const supplyTypes = await getSupplyTypes();
  
  // Filter items with quantity > 0, as the view might still return them before a refresh
  const itemsInStock = allItems?.filter(item => item.quantity > 0) || [];

  const totalSupplies = itemsInStock.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const expiringSupplies = itemsInStock.filter(i => i.status === 'expiring_soon').length || 0;
  const expiredSupplies = itemsInStock.filter(i => i.status === 'expired').length || 0;
  const validSupplies = itemsInStock.filter(i => i.status === 'valid').length || 0;

  // Calculate reorder point items
  const inventoryByProductVariant = itemsInStock.reduce((acc, item) => {
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
  const typeCounts = itemsInStock.reduce((acc, item) => {
    const def = productDefs.find(p => p.id === item.product_definition_id);
    if (def) {
      const supplyType = supplyTypes.find(st => st.id === def.type_id);
      const typeName = supplyType ? supplyType.name : 'Unknown';
      acc[typeName] = (acc[typeName] || 0) + item.quantity;
    }
    return acc;
  }, {} as Record<string, number>);

  // Fetch recent activities
  const { data: supplyVouchers, error: supplyVouchersError } = await supabase
    .from('supply_vouchers')
    .select('created_at, voucher_number')
    .order('created_at', { ascending: false })
    .limit(3);

  const { data: consumptionRecords, error: consumptionRecordsError } = await supabase
    .from('consumption_records')
    .select('created_at, department')
    .order('created_at', { ascending: false })
    .limit(3);

  if (supplyVouchersError) console.error("Error fetching supply vouchers:", supplyVouchersError);
  if (consumptionRecordsError) console.error("Error fetching consumption records:", consumptionRecordsError);

  const supplyActivities: RecentActivity[] = (supplyVouchers || []).map(v => ({
    type: 'supply',
    date: new Date(v.created_at),
    description: `Voucher #${v.voucher_number}`,
  }));

  const consumptionActivities: RecentActivity[] = (consumptionRecords || []).map(r => ({
    type: 'consumption',
    date: new Date(r.created_at),
    description: `Dept: ${r.department}`,
  }));

  const recentActivities: RecentActivity[] = [...supplyActivities, ...consumptionActivities]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 4);


  return {
    totalSupplies,
    expiringSupplies,
    expiredSupplies,
    reorderPointItems,
    validSupplies,
    typeCounts,
    recentActivities,
  };
};
