import { getSupabaseClient } from '@/lib/supabaseClient';
import { InventoryItem } from '@/types';
import { format } from 'date-fns';

/**
 * Get all inventory items with their dynamic status
 */
export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('inventory_items_with_status') // Use the new VIEW
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory items:', error);
    throw error;
  }
  return data || [];
};

/**
 * Transfer a quantity of an item from one store to another.
 * This will be handled by an RPC call to ensure atomicity.
 */
export const transferInventoryItems = async (
  items: { itemId: string; quantity: number; fromStoreId: string; toStoreId: string }[]
): Promise<{ success: boolean; error?: any }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // The RPC function 'transfer_inventory' will handle the logic on the database side.
  const { error } = await supabase.rpc('transfer_inventory', {
    items_to_transfer: items,
  });

  if (error) {
    console.error('Error transferring inventory:', error);
    return { success: false, error };
  }

  return { success: true };
};

/**
 * Get a single inventory item by ID with its dynamic status
 */
export const getInventoryItemById = async (itemId: string): Promise<InventoryItem | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('inventory_items_with_status') // Use the new VIEW
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    console.error(`Error fetching item ${itemId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Add a new inventory item or a batch of items
 */
export const addInventoryItems = async (items: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status'>[]): Promise<InventoryItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const itemsToInsert = items.map(item => ({
    ...item,
    // Status can be determined here based on expiry date if needed
  }));

  const { data, error } = await supabase
    .from('inventory_items')
    .insert(itemsToInsert)
    .select();

  if (error) {
    console.error('Error adding inventory items:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing inventory item
 */
export const updateInventoryItem = async (itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating item ${itemId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete an inventory item
 */
export const deleteInventoryItem = async (itemId: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Check if this item is used in consumption records
  const { data: consumption, error: checkError } = await supabase
    .from('consumption_items')
    .select('id')
    .eq('inventory_item_id', itemId)
    .limit(1);

  if (checkError) {
    console.error('Error checking for item usage:', checkError);
    return { success: false, error: 'check_failed' };
  }

  if (consumption && consumption.length > 0) {
    return { success: false, error: 'item_in_use' };
  }

  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    console.error(`Error deleting item ${itemId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};

/**
 * Get soon to expire inventory items
 */
export const getSoonToExpireItems = async (daysThreshold: number): Promise<InventoryItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const today = new Date();
  const thresholdDate = new Date();
  thresholdDate.setDate(today.getDate() + daysThreshold);

  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .lte('expiry_date', format(thresholdDate, 'yyyy-MM-dd'))
    .gt('expiry_date', format(today, 'yyyy-MM-dd'))
    .gt('quantity', 0);

  if (error) {
    console.error('Error fetching soon-to-expire items:', error);
    throw error;
  }
  return data || [];
};

/**
 * Get expired inventory items
 */
export const getExpiredItems = async (): Promise<InventoryItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const today = new Date();
  
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .lte('expiry_date', format(today, 'yyyy-MM-dd'))
    .gt('quantity', 0);

  if (error) {
    console.error('Error fetching expired items:', error);
    throw error;
  }
  return data || [];
};
