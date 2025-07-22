import { getSupabaseClient } from '@/lib/supabaseClient';
import { ProductDefinition } from '@/types';

/**
 * Get all product definitions
 */
export const getProductDefinitions = async (): Promise<ProductDefinition[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return []; // Return empty array if client is not available

  const { data, error } = await supabase
    .from('product_definitions')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching product definitions:', error);
    throw error;
  }
  return data || [];
};

/**
 * Add a new product definition
 */
export const addProductDefinition = async (definition: Omit<ProductDefinition, 'id' | 'created_at' | 'updated_at'>): Promise<ProductDefinition> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('product_definitions')
    .insert([definition])
    .select()
    .single();

  if (error) {
    console.error('Error adding product definition:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing product definition
 */
export const updateProductDefinition = async (definitionId: string, updates: Partial<ProductDefinition>): Promise<ProductDefinition> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase
    .from('product_definitions')
    .update(updates)
    .eq('id', definitionId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating product definition ${definitionId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete a product definition
 */
export const deleteProductDefinition = async (definitionId: string): Promise<{ success: boolean; error?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase
    .from('product_definitions')
    .delete()
    .eq('id', definitionId);

  if (error) {
    console.error(`Error deleting product definition ${definitionId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};
