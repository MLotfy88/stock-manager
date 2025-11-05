import { getSupabaseClient } from '@/lib/supabaseClient';
import { OnShelfItemStatus, OnShelfInvoiceItem } from '@/types';

export const getOnShelfReportData = async (): Promise<OnShelfItemStatus[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('on_shelf_item_status')
    .select('*');

  if (error) {
    console.error('Error fetching on-shelf report data:', error);
    throw error;
  }

  return data || [];
};

export const getOnShelfInvoiceItems = async (): Promise<OnShelfInvoiceItem[]> => {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('on_shelf_invoice_items')
    .select('*');

  if (error) {
    console.error('Error fetching on-shelf invoice items:', error);
    throw error;
  }

  return data || [];
};
