import { getSupabaseClient } from '@/lib/supabaseClient';
import { Store } from '@/types';

/**
 * Get all stores
 */
export const getStores = async (): Promise<Store[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching stores:', error);
    throw error;
  }
  return data || [];
};

/**
 * Add a new store
 */
export const addStore = async (store: Omit<Store, 'id' | 'created_at'>): Promise<Store> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('stores')
    .insert([store])
    .select()
    .single();

  if (error) {
    console.error('Error adding store:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing store
 */
export const updateStore = async (storeId: string, updates: Partial<Store>): Promise<Store> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('stores')
    .update(updates)
    .eq('id', storeId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating store ${storeId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete a store
 */
export const deleteStore = async (storeId: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('stores')
    .delete()
    .eq('id', storeId);

  if (error) {
    console.error(`Error deleting store ${storeId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};
