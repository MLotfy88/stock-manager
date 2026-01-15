
import { supabase } from '@/lib/supabase';
import { Package, PackageItem } from '@/types';

// Fetch all packages with their items
export const getPackages = async () => {
    const { data, error } = await supabase
        .from('packages')
        .select(`
      *,
      items:package_items (
        *,
        product_definition:product_definitions (name)
      )
    `)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

// Create a new package
export const createPackage = async (name: string, description: string, items: Omit<PackageItem, 'id' | 'package_id'>[]) => {
    // 1. Create Package Header
    const { data: pkgData, error: pkgError } = await supabase
        .from('packages')
        .insert({ name, description })
        .select()
        .single();

    if (pkgError) throw pkgError;

    // 2. Create Package Items
    const itemsWithPkgId = items.map(item => ({
        package_id: pkgData.id,
        product_definition_id: item.product_definition_id,
        variant: item.variant,
        quantity: item.quantity
    }));

    const { error: itemsError } = await supabase
        .from('package_items')
        .insert(itemsWithPkgId);

    if (itemsError) {
        // Rollback (simple deletion of package if items fail)
        await supabase.from('packages').delete().eq('id', pkgData.id);
        throw itemsError;
    }

    return pkgData;
};

// Delete a package
export const deletePackage = async (id: string) => {
    const { error } = await supabase.from('packages').delete().eq('id', id);
    if (error) throw error;
    return true;
};
