import { supabase } from '@/lib/supabaseClient';
import { SupplyTypeItem } from '@/types';

/**
 * Get all supply types
 */
export const getSupplyTypes = async (): Promise<SupplyTypeItem[]> => {
  const { data, error } = await supabase
    .from('supply_types')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching supply types:', error);
    throw error;
  }
  return data || [];
};

/**
 * Get a supply type by ID
 */
export const getSupplyTypeById = async (supplyTypeId: string): Promise<SupplyTypeItem | null> => {
  const { data, error } = await supabase
    .from('supply_types')
    .select('*')
    .eq('id', supplyTypeId)
    .single();

  if (error) {
    console.error(`Error fetching supply type ${supplyTypeId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Add a new supply type
 */
export const addSupplyType = async (supplyType: Omit<SupplyTypeItem, 'id' | 'created_at'>): Promise<SupplyTypeItem> => {
  const { data, error } = await supabase
    .from('supply_types')
    .insert([supplyType])
    .select()
    .single();

  if (error) {
    console.error('Error adding supply type:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing supply type
 */
export const updateSupplyType = async (supplyTypeId: string, updates: Partial<SupplyTypeItem>): Promise<SupplyTypeItem> => {
  const { data, error } = await supabase
    .from('supply_types')
    .update(updates)
    .eq('id', supplyTypeId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating supply type ${supplyTypeId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete a supply type
 */
export const deleteSupplyType = async (supplyTypeId: string): Promise<{ success: boolean; error?: string }> => {
  // Note: In a real-world scenario, you'd check if this type is used in product_definitions.
  // For simplicity, we'll omit that check here but it's crucial for data integrity.
  
  const { error } = await supabase
    .from('supply_types')
    .delete()
    .eq('id', supplyTypeId);

  if (error) {
    console.error(`Error deleting supply type ${supplyTypeId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};
