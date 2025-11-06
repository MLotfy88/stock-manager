import { getSupabaseClient } from '@/lib/supabaseClient';
import { ConsumptionItem, InventoryItem, ConsumptionRecord } from '@/types';

type ConsumptionItemPayload = {
  inventory_item_id: string;
  quantity: number;
};

export const addConsumptionRecord = async (
  record: Omit<ConsumptionRecord, 'id' | 'created_at' | 'items' | 'status'>,
  items: ConsumptionItemPayload[]
): Promise<ConsumptionRecord> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.rpc('create_consumption_record', {
    p_date: record.date,
    p_department: record.department,
    p_purpose: record.purpose,
    p_requested_by: record.requested_by,
    p_notes: record.notes,
    p_items: items,
  });

  if (error) {
    console.error('Error creating consumption record:', error);
    throw error;
  }

  return data;
};

export const getConsumptionRecords = async (): Promise<ConsumptionRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('consumption_records')
    .select(`
      *,
      items:consumption_record_items (
        *,
        inventory_item:inventory_item_id (
          *,
          product_definition:product_definition_id (*)
        )
      )
    `);

  if (error) {
    console.error('Error fetching consumption records:', error);
    throw error;
  }

  return data || [];
};

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

export const deleteConsumptionRecord = async (recordId: string): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.rpc('delete_consumption_record', {
    p_record_id: recordId,
  });

  if (error) {
    console.error('Error deleting consumption record:', error);
    throw error;
  }
};
