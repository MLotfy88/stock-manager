import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyVoucher, InventoryItem, StockType } from '@/types';

type NewInventoryItemPayload = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'stock_type' | 'supply_voucher_id' | 'store_name' | 'product_name' | 'reorder_point' | 'supply_type_name' | 'manufacturer_name' | 'supplier_name'>;

export const createSupplyVoucherWithItems = async (
  voucherData: Omit<SupplyVoucher, 'id' | 'created_at'>,
  items: NewInventoryItemPayload[]
): Promise<{ voucher: SupplyVoucher; items: InventoryItem[] }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // 1. Create the supply voucher
  const { data: voucher, error: voucherError } = await supabase
    .from('supply_vouchers')
    .insert({
      supplier_id: voucherData.supplier_id,
      date: voucherData.date,
      stock_type: voucherData.stock_type,
      notes: voucherData.notes,
      voucher_number: voucherData.voucher_number,
    })
    .select()
    .single();

  if (voucherError) {
    console.error('Error creating supply voucher:', voucherError);
    throw voucherError;
  }

  // 2. Prepare inventory items with the new voucher ID and stock type
  const itemsToInsert = items.map(item => ({
    ...item,
    supply_voucher_id: voucher.id,
    stock_type: voucher.stock_type,
  }));

  // 3. Insert the inventory items
  const { data: newItems, error: itemsError } = await supabase
    .from('inventory_items')
    .insert(itemsToInsert)
    .select();

  if (itemsError) {
    console.error('Error adding inventory items for voucher:', itemsError);
    // TODO: Add logic to delete the created voucher to avoid orphaned records
    throw itemsError;
  }

  return { voucher, items: newItems };
};

export const createOnShelfInvoice = async (consumptionItemIds: string[]): Promise<void> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.rpc('create_on_shelf_invoice', {
    p_consumption_item_ids: consumptionItemIds,
  });

  if (error) {
    console.error('Error creating on-shelf invoice:', error);
    throw error;
  }
};
