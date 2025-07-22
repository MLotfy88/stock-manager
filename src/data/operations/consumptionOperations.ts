import { getSupabaseClient } from '@/lib/supabaseClient';
import { ConsumptionRecord, ConsumptionItem, InventoryItem } from '@/types';

/**
 * Get all consumption records with their items
 */
export const getConsumptionRecords = async (): Promise<ConsumptionRecord[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('consumption_records')
    .select(`
      *,
      items:consumption_record_items(*)
    `)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching consumption records:', error);
    throw error;
  }
  return data || [];
};

/**
 * Add a new consumption record
 * This is a transaction to ensure data integrity
 */
export const addConsumptionRecord = async (record: Omit<ConsumptionRecord, 'id' | 'created_at' | 'items'> & { items: Omit<ConsumptionItem, 'id' | 'consumption_record_id'>[] }): Promise<ConsumptionRecord> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Use a Supabase function to handle the transaction
  const { data, error } = await supabase.rpc('create_consumption_record', {
    p_date: record.date,
    p_department: record.department,
    p_purpose: record.purpose,
    p_requested_by: record.requested_by,
    p_notes: record.notes,
    p_items: record.items
  });

  if (error) {
    console.error('Error in create_consumption_record RPC:', error);
    if (error.message.includes('check_inventory_quantity')) {
      throw new Error('insufficient_quantity');
    }
    throw error;
  }

  // The RPC function should return the newly created record
  return data;
};


/**
 * Delete a consumption record
 * This is a transaction to ensure data integrity
 */
export const deleteConsumptionRecord = async (recordId: string): Promise<{ success: boolean }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Use a Supabase function to handle the transaction
  const { error } = await supabase.rpc('delete_consumption_record', {
    p_record_id: recordId
  });

  if (error) {
    console.error('Error in delete_consumption_record RPC:', error);
    throw error;
  }

  return { success: true };
};
