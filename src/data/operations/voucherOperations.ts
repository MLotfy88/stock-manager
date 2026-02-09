import { getSupabaseClient } from '@/lib/supabaseClient';
import { SupplyVoucher, InventoryItem, StockType } from '@/types';
import { ensureValidSession } from '@/lib/sessionManager';

type NewInventoryItemPayload = Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'stock_type' | 'supply_voucher_id' | 'store_name' | 'product_name' | 'reorder_point' | 'supply_type_name' | 'manufacturer_name' | 'supplier_name'>;

export const createSupplyVoucherWithItems = async (
  voucherData: Omit<SupplyVoucher, 'id' | 'created_at'>,
  items: NewInventoryItemPayload[]
): Promise<{ voucher: SupplyVoucher; items: InventoryItem[] }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Ensure session is valid before critical operation
  const sessionValid = await ensureValidSession();
  if (!sessionValid) {
    const error: any = new Error('Session expired or invalid');
    error.code = 'AUTH_SESSION_EXPIRED';
    error.hint = 'Please log in again to continue. Your work may be saved as a draft.';
    throw error;
  }

  // 1. Create the supply voucher
  const { data: voucher, error: voucherError } = await supabase
    .from('supply_vouchers')
    .insert({
      supplier_id: voucherData.supplier_id,
      date: voucherData.date,
      stock_type: voucherData.stock_type,
      notes: voucherData.notes,
      voucher_number: voucherData.voucher_number,
      payment_method: voucherData.payment_method,
      payment_status: voucherData.payment_status,
      total_amount: voucherData.total_amount,
      paid_amount: voucherData.paid_amount,
      invoice_image_urls: voucherData.invoice_image_urls,
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

  // 4. Insert installments if any
  if (voucherData.installments && voucherData.installments.length > 0) {
    const installmentsToInsert = voucherData.installments.map(inst => ({
      voucher_id: voucher.id,
      amount: inst.amount,
      due_date: inst.due_date,
      status: 'pending',
      notes: inst.notes
    }));

    const { error: instError } = await supabase
      .from('voucher_installments')
      .insert(installmentsToInsert);

    if (instError) {
      console.error("Error creating installments:", instError);
      // Non-critical (?) but should be handled
    }
  }

  return { voucher, items: newItems };
};
// --- Draft Operations ---

export const saveDraftVoucher = async (
  voucherData: Omit<SupplyVoucher, 'id' | 'created_at'> & { id?: string },
  cartItems: any[]
): Promise<SupplyVoucher> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Ensure session is valid before draft save
  const sessionValid = await ensureValidSession();
  if (!sessionValid) {
    const error: any = new Error('Session expired or invalid');
    error.code = 'AUTH_SESSION_EXPIRED';
    error.hint = 'Please log in again to save your work.';
    throw error;
  }

  // Note: installments are stored in separate table, not in supply_vouchers
  const payload = {
    supplier_id: voucherData.supplier_id,
    date: voucherData.date,
    stock_type: voucherData.stock_type,
    notes: voucherData.notes,
    voucher_number: voucherData.voucher_number,
    payment_method: voucherData.payment_method,
    payment_status: voucherData.payment_status,
    total_amount: voucherData.total_amount,
    paid_amount: voucherData.paid_amount,
    invoice_image_urls: voucherData.invoice_image_urls,
    status: 'draft',
    draft_items: cartItems
    // installments are NOT included here - they're in voucher_installments table
  };

  let result;
  if (voucherData.id) {
    // Update
    result = await supabase.from('supply_vouchers').update(payload).eq('id', voucherData.id).select().single();
  } else {
    // Create
    result = await supabase.from('supply_vouchers').insert(payload).select().single();
  }

  if (result.error) throw result.error;
  return result.data;
};

export const finalizeDraftVoucher = async (
  voucherId: string,
  voucherData: Omit<SupplyVoucher, 'id' | 'created_at'>,
  items: NewInventoryItemPayload[]
): Promise<{ voucher: SupplyVoucher; items: InventoryItem[] }> => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Ensure session is valid before finalizing
  const sessionValid = await ensureValidSession();
  if (!sessionValid) {
    const error: any = new Error('Session expired or invalid');
    error.code = 'AUTH_SESSION_EXPIRED';
    error.hint = 'Please log in again to finalize this draft.';
    throw error;
  }

  // 1. Update status to completed and clear draft_items
  // Extract installments separately since they go to a different table
  const { installments, ...voucherUpdateData } = voucherData;

  const { data: voucher, error: voucherError } = await supabase
    .from('supply_vouchers')
    .update({
      ...voucherUpdateData,
      status: 'completed',
      draft_items: [] // Clear draft items to save space
    })
    .eq('id', voucherId)
    .select()
    .single();

  if (voucherError) throw voucherError;

  // 2. Insert Inventory Items (Same logic as create)
  const itemsToInsert = items.map(item => ({
    ...item,
    supply_voucher_id: voucherId,
    stock_type: voucher.stock_type,
  }));

  const { data: newItems, error: itemsError } = await supabase
    .from('inventory_items')
    .insert(itemsToInsert)
    .select();

  if (itemsError) throw itemsError;

  // 3. Insert Installments (Same logic)
  if (voucherData.installments && voucherData.installments.length > 0) {
    // Clean installments payload? Usually they don't have IDs yet if from draft.
    const installmentsToInsert = installments.map(inst => ({
      voucher_id: voucherId,
      amount: inst.amount,
      due_date: inst.due_date,
      status: 'pending',
      notes: inst.notes
    }));

    const { error: instError } = await supabase
      .from('voucher_installments')
      .insert(installmentsToInsert);

    if (instError) console.error("Error creating installments:", instError);
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
