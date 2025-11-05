import { getSupabaseClient } from '@/lib/supabaseClient';
import { ConsumptionItem, InventoryItem } from '@/types';

export interface ConsumedOnShelfItem extends ConsumptionItem {
  inventory_item: InventoryItem;
  consumption_date: string;
  department: string;
}

export const getConsumedOnShelfItems = async (): Promise<ConsumedOnShelfItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('consumption_record_items')
    .select(`
      *,
      inventory_items:inventory_item_id (
        *,
        product_definitions (name),
        suppliers (name)
      ),
      consumption_records (
        date,
        department
      )
    `)
    .eq('inventory_items.stock_type', 'on_shelf');

  if (error) {
    console.error('Error fetching consumed on-shelf items:', error);
    throw error;
  }

  // Transform the data to a flatter structure
  const transformedData = data.map(item => ({
    ...item,
    inventory_item: item.inventory_items,
    consumption_date: item.consumption_records.date,
    department: item.consumption_records.department,
  }));

  return transformedData as any;
};
