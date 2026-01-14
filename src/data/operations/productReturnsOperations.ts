import { supabase } from '@/lib/supabaseClient';

export interface ProductReturn {
    id: string;
    inventory_item_id: string | null;
    product_definition_id: string;
    variant: string;
    return_type: 'defective' | 'expired' | 'damaged' | 'wrong_item' | 'other';
    quantity: number;
    reason: string;
    supplier_id: string | null;
    status: 'pending' | 'approved' | 'replaced' | 'refunded' | 'rejected';
    photos: string[] | null;
    replacement_item_id: string | null;
    refund_amount: number | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface ProductReturnWithDetails extends ProductReturn {
    product_name?: string;
    supplier_name?: string;
}

export async function getProductReturns(status?: string): Promise<ProductReturnWithDetails[]> {
    try {
        let query = supabase
            .from('product_returns')
            .select(`
        *,
        product_definition:product_definitions(name),
        supplier:suppliers(name)
      `)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(item => ({
            ...item,
            product_name: item.product_definition?.name,
            supplier_name: item.supplier?.name
        }));
    } catch (error) {
        console.error('Error fetching returns:', error);
        throw error;
    }
}

export async function createProductReturn(returnData: Omit<ProductReturn, 'id' | 'created_at' | 'updated_at'>): Promise<ProductReturn> {
    try {
        const { data, error } = await supabase
            .from('product_returns')
            .insert(returnData)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating return:', error);
        throw error;
    }
}

export async function updateProductReturnStatus(
    returnId: string,
    status: ProductReturn['status'],
    additionalData?: { refund_amount?: number; replacement_item_id?: string; notes?: string }
): Promise<void> {
    try {
        const { error } = await supabase
            .from('product_returns')
            .update({ status, ...additionalData })
            .eq('id', returnId);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating return status:', error);
        throw error;
    }
}

export async function getReturnStats() {
    try {
        const { data, error } = await supabase
            .from('product_returns')
            .select('status, return_type, quantity, refund_amount');

        if (error) throw error;

        const stats = {
            total: data.length,
            pending: data.filter(r => r.status === 'pending').length,
            approved: data.filter(r => r.status === 'approved').length,
            replaced: data.filter(r => r.status === 'replaced').length,
            refunded: data.filter(r => r.status === 'refunded').length,
            rejected: data.filter(r => r.status === 'rejected').length,
            totalQuantity: data.reduce((sum, r) => sum + r.quantity, 0),
            totalRefundValue: data.reduce((sum, r) => sum + (r.refund_amount || 0), 0),
            byType: {
                defective: data.filter(r => r.return_type === 'defective').length,
                expired: data.filter(r => r.return_type === 'expired').length,
                damaged: data.filter(r => r.return_type === 'damaged').length,
                wrong_item: data.filter(r => r.return_type === 'wrong_item').length,
                other: data.filter(r => r.return_type === 'other').length,
            }
        };

        return stats;
    } catch (error) {
        console.error('Error getting return stats:', error);
        throw error;
    }
}
