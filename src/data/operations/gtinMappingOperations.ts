import { supabase } from '@/lib/supabaseClient';

export interface GTINMapping {
  gtin: string;
  product_definition_id: string;
  variant_name: string;
  last_supplier_id?: string | null;
  average_price?: number | null;
  scan_count?: number;
  last_scanned_at?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get GTIN mapping by GTIN code
 * Also updates last_scanned_at and increments scan_count
 */
export async function getGTINMapping(gtin: string): Promise<GTINMapping | null> {
  try {
    const { data, error } = await supabase
      .from('gtin_product_mapping')
      .select('*')
      .eq('gtin', gtin)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // Update last scanned time and increment count asynchronously
    supabase
      .from('gtin_product_mapping')
      .update({
        last_scanned_at: new Date().toISOString(),
        scan_count: (data.scan_count || 0) + 1
      })
      .eq('gtin', gtin)
      .then(); // Fire and forget
    
    return data as GTINMapping;
  } catch (error) {
    console.error('Error fetching GTIN mapping:', error);
    return null;
  }
}

/**
 * Save or update GTIN mapping
 */
export async function saveGTINMapping(mapping: Omit<GTINMapping, 'created_at' | 'updated_at' | 'last_scanned_at' | 'scan_count'>): Promise<void> {
  try {
    const { error } = await supabase
      .from('gtin_product_mapping')
      .upsert({
        gtin: mapping.gtin,
        product_definition_id: mapping.product_definition_id,
        variant_name: mapping.variant_name,
        last_supplier_id: mapping.last_supplier_id || null,
        average_price: mapping.average_price || null,
        last_scanned_at: new Date().toISOString(),
        scan_count: 1
      }, {
        onConflict: 'gtin',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw new Error(`Failed to save GTIN mapping: ${error.message}`);
    }
  } catch (error) {
    console.error('Error saving GTIN mapping:', error);
    throw error;
  }
}

/**
 * Update average price for a GTIN
 */
export async function updateGTINPrice(gtin: string, newPrice: number): Promise<void> {
  try {
    const existing = await getGTINMapping(gtin);
    if (!existing) return;
    
    // Calculate new average (simple moving average)
    const currentAvg = existing.average_price || 0;
    const count = existing.scan_count || 1;
    const newAverage = ((currentAvg * count) + newPrice) / (count + 1);
    
    const { error } = await supabase
      .from('gtin_product_mapping')
      .update({ average_price: newAverage })
      .eq('gtin', gtin);
    
    if (error) {
      throw new Error(`Failed to update GTIN price: ${error.message}`);
    }
  } catch (error) {
    console.error('Error updating GTIN price:', error);
  }
}

/**
 * Delete a GTIN mapping
 */
export async function deleteGTINMapping(gtin: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('gtin_product_mapping')
      .delete()
      .eq('gtin', gtin);
    
    if (error) {
      throw new Error(`Failed to delete GTIN mapping: ${error.message}`);
    }
  } catch (error) {
    console.error('Error deleting GTIN mapping:', error);
    throw error;
  }
}

/**
 * Get all mappings for a specific product
 */
export async function getProductGTINs(productDefinitionId: string): Promise<GTINMapping[]> {
  try {
    const { data, error } = await supabase
      .from('gtin_product_mapping')
      .select('*')
      .eq('product_definition_id', productDefinitionId)
      .order('scan_count', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch product GTINs: ${error.message}`);
    }
    
    return (data as GTINMapping[]) || [];
  } catch (error) {
    console.error('Error fetching product GTINs:', error);
    return [];
  }
}

/**
 * Batch save multiple GTIN mappings
 */
export async function batchSaveGTINMappings(mappings: Omit<GTINMapping, 'created_at' | 'updated_at' | 'last_scanned_at' | 'scan_count'>[]): Promise<void> {
  try {
    const records = mappings.map(m => ({
      gtin: m.gtin,
      product_definition_id: m.product_definition_id,
      variant_name: m.variant_name,
      last_supplier_id: m.last_supplier_id || null,
      average_price: m.average_price || null,
      last_scanned_at: new Date().toISOString(),
      scan_count: 1
    }));
    
    const { error } = await supabase
      .from('gtin_product_mapping')
      .upsert(records, {
        onConflict: 'gtin',
        ignoreDuplicates: false
      });
    
    if (error) {
      throw new Error(`Failed to batch save GTIN mappings: ${error.message}`);
    }
  } catch (error) {
    console.error('Error batch saving GTIN mappings:', error);
    throw error;
  }
}
