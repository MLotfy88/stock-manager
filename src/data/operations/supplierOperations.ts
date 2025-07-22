import { supabase } from '@/lib/supabaseClient';
import { Supplier } from '@/types';

/**
 * Get all suppliers
 */
export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching suppliers:', error);
    throw error;
  }
  return data || [];
};

/**
 * Get a supplier by ID
 */
export const getSupplierById = async (supplierId: string): Promise<Supplier | null> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', supplierId)
    .single();

  if (error) {
    console.error(`Error fetching supplier ${supplierId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Add a new supplier
 */
export const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .insert([supplier])
    .select()
    .single();

  if (error) {
    console.error('Error adding supplier:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing supplier
 */
export const updateSupplier = async (supplierId: string, updates: Partial<Supplier>): Promise<Supplier> => {
  const { data, error } = await supabase
    .from('suppliers')
    .update(updates)
    .eq('id', supplierId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating supplier ${supplierId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete a supplier
 */
export const deleteSupplier = async (supplierId: string): Promise<{ success: boolean; error?: string }> => {
  const { data: supplies, error: checkError } = await supabase
    .from('supplies')
    .select('id')
    .eq('supplier_id', supplierId)
    .limit(1);

  if (checkError) {
    console.error('Error checking for supplier usage:', checkError);
    return { success: false, error: 'check_failed' };
  }

  if (supplies && supplies.length > 0) {
    return { success: false, error: 'supplier_in_use' };
  }

  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', supplierId);

  if (error) {
    console.error(`Error deleting supplier ${supplierId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};
