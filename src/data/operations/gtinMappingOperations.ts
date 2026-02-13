import { supabase } from '@/lib/supabaseClient';

export interface GTINMapping {
  gtin: string;
  product_definition_id: string;
  variant_name: string;
  last_supplier_id?: string;
  average_price?: number;
  created_at?: string;
  last_scanned_at?: string;
}

export const getGTINMapping = async (gtin: string): Promise<GTINMapping | null> => {
  const { data, error } = await supabase
    .from('gtin_variant_mapping')
    .select('*')
    .eq('gtin', gtin)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
    console.error('Error fetching GTIN mapping:', error);
    return null;
  }

  return data;
};

export const createOrUpdateGTINMapping = async (mapping: Omit<GTINMapping, 'created_at' | 'last_scanned_at'>) => {
  const { error } = await supabase
    .from('gtin_variant_mapping')
    .upsert({
      ...mapping,
      last_scanned_at: new Date().toISOString()
    });

  if (error) throw error;
};

export const updateLastScanned = async (gtin: string) => {
  const { error } = await supabase
    .from('gtin_variant_mapping')
    .update({ last_scanned_at: new Date().toISOString() })
    .eq('gtin', gtin);

  if (error) throw error;
};

export const batchSaveGTINMappings = async (mappings: Omit<GTINMapping, 'created_at' | 'last_scanned_at'>[]) => {
  // FIX: Remove duplicates by GTIN (keep last occurrence)
  // This prevents PostgreSQL error 21000: "ON CONFLICT DO UPDATE command cannot affect row a second time"
  const uniqueMappings = new Map<string, Omit<GTINMapping, 'created_at' | 'last_scanned_at'>>();
  
  // Iterate through mappings, later items will overwrite earlier ones with same GTIN
  mappings.forEach(mapping => {
    uniqueMappings.set(mapping.gtin, mapping);
  });

  // Convert Map values back to array
  const deduplicatedMappings = Array.from(uniqueMappings.values());

  // Only proceed if we have mappings to save
  if (deduplicatedMappings.length === 0) return;

  const { error } = await supabase
    .from('gtin_variant_mapping')
    .upsert(
      deduplicatedMappings.map(m => ({
        ...m,
        last_scanned_at: new Date().toISOString()
      }))
    );

  if (error) throw error;
};

