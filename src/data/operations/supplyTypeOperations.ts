import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyTypeItem } from '@/types';

/**
 * Get all supply types
 */
export const getSupplyTypes = async (): Promise<SupplyTypeItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

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
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Check if the supply type is being used in product_definitions
  const { data: definitions, error: checkError } = await supabase
    .from('product_definitions')
    .select('id')
    .eq('type_id', supplyTypeId)
    .limit(1);

  if (checkError) {
    console.error('Error checking for supply type usage:', checkError);
    return { success: false, error: 'check_failed' };
  }

  if (definitions && definitions.length > 0) {
    return { success: false, error: 'supply_type_in_use' };
  }
  
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
