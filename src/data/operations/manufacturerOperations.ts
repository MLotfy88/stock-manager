import { supabase } from '@/lib/supabaseClient';
import { Manufacturer } from '@/types';

/**
 * Get all manufacturers
 */
export const getManufacturers = async (): Promise<Manufacturer[]> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching manufacturers:', error);
    throw error;
  }
  return data || [];
};

/**
 * Get a manufacturer by ID
 */
export const getManufacturerById = async (manufacturerId: string): Promise<Manufacturer | null> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .select('*')
    .eq('id', manufacturerId)
    .single();

  if (error) {
    console.error(`Error fetching manufacturer ${manufacturerId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Add a new manufacturer
 */
export const addManufacturer = async (manufacturer: Omit<Manufacturer, 'id' | 'created_at'>): Promise<Manufacturer> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .insert([manufacturer])
    .select()
    .single();

  if (error) {
    console.error('Error adding manufacturer:', error);
    throw error;
  }
  return data;
};

/**
 * Update an existing manufacturer
 */
export const updateManufacturer = async (manufacturerId: string, updates: Partial<Manufacturer>): Promise<Manufacturer> => {
  const { data, error } = await supabase
    .from('manufacturers')
    .update(updates)
    .eq('id', manufacturerId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating manufacturer ${manufacturerId}:`, error);
    throw error;
  }
  return data;
};

/**
 * Delete a manufacturer
 */
export const deleteManufacturer = async (manufacturerId: string): Promise<{ success: boolean; error?: string }> => {
  // First, check if the manufacturer is being used in the 'supplies' table.
  // This is a simplified check. In a real app, you might want more robust cascading or checks.
  const { data: supplies, error: checkError } = await supabase
    .from('supplies')
    .select('id')
    .eq('manufacturer_id', manufacturerId)
    .limit(1);

  if (checkError) {
    console.error('Error checking for manufacturer usage:', checkError);
    return { success: false, error: 'check_failed' };
  }

  if (supplies && supplies.length > 0) {
    return { success: false, error: 'manufacturer_in_use' };
  }

  // If not in use, proceed with deletion
  const { error } = await supabase
    .from('manufacturers')
    .delete()
    .eq('id', manufacturerId);

  if (error) {
    console.error(`Error deleting manufacturer ${manufacturerId}:`, error);
    return { success: false, error: 'delete_failed' };
  }

  return { success: true };
};
