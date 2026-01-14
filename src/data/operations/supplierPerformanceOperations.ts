import { supabase } from '@/lib/supabaseClient';

export interface SupplierPerformance {
    id: string;
    supplier_id: string;
    total_orders: number;
    on_time_deliveries: number;
    quality_issues: number;
    avg_delivery_days: number | null;
    quality_rating: number | null;
    delivery_rating: number | null;
    price_rating: number | null;
    last_updated: string;
}

export interface SupplierIssue {
    id: string;
    supplier_id: string;
    issue_type: 'late_delivery' | 'quality' | 'wrong_items' | 'damaged' | 'other';
    description: string | null;
    severity: number;
    resolved: boolean;
    resolved_at: string | null;
    created_at: string;
}

export interface SupplierPerformanceSummary {
    id: string;
    name: string;
    total_orders: number;
    on_time_deliveries: number;
    quality_issues: number;
    avg_delivery_days: number | null;
    quality_rating: number | null;
    delivery_rating: number | null;
    price_rating: number | null;
    overall_rating: number | null;
    open_issues: number;
    last_updated: string | null;
}

export async function getSupplierPerformanceSummary(): Promise<SupplierPerformanceSummary[]> {
    try {
        const { data, error } = await supabase
            .from('supplier_performance_summary')
            .select('*')
            .order('overall_rating', { ascending: false, nullsLast: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching supplier performance:', error);
        throw error;
    }
}

export async function getSupplierIssues(supplierId?: string): Promise<SupplierIssue[]> {
    try {
        let query = supabase
            .from('supplier_issues')
            .select('*')
            .order('created_at', { ascending: false });

        if (supplierId) {
            query = query.eq('supplier_id', supplierId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching supplier issues:', error);
        throw error;
    }
}

export async function addSupplierIssue(issue: Omit<SupplierIssue, 'id' | 'created_at' | 'resolved_at'>): Promise<SupplierIssue> {
    try {
        const { data, error } = await supabase
            .from('supplier_issues')
            .insert(issue)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding supplier issue:', error);
        throw error;
    }
}

export async function resolveSupplierIssue(issueId: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('supplier_issues')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('id', issueId);

        if (error) throw error;
    } catch (error) {
        console.error('Error resolving issue:', error);
        throw error;
    }
}

export async function updateSupplierRating(
    supplierId: string,
    ratings: {
        quality_rating?: number;
        delivery_rating?: number;
        price_rating?: number;
    }
): Promise<void> {
    try {
        const { data: existing } = await supabase
            .from('supplier_performance')
            .select('*')
            .eq('supplier_id', supplierId)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('supplier_performance')
                .update({ ...ratings, last_updated: new Date().toISOString() })
                .eq('supplier_id', supplierId);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('supplier_performance')
                .insert({ supplier_id: supplierId, ...ratings });

            if (error) throw error;
        }
    } catch (error) {
        console.error('Error updating supplier rating:', error);
        throw error;
    }
}
