import { supabase } from '@/lib/supabaseClient';

export interface ProcedureType {
    id: string;
    name: string;
    description?: string | null;
    created_at?: string;
}

export interface ProcedureTemplate {
    id: string;
    procedure_type_id: string;
    name: string;
    description?: string | null;
    created_by?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ProcedureTemplateItem {
    id: string;
    template_id: string;
    product_definition_id: string;
    variant: string;
    default_quantity: number;
    notes?: string | null;
}

export interface ProcedureTemplateWithItems extends ProcedureTemplate {
    items: ProcedureTemplateItem[];
    procedure_type?: ProcedureType;
}

/**
 * Get all procedure types
 */
export async function getProcedureTypes(): Promise<ProcedureType[]> {
    try {
        const { data, error } = await supabase
            .from('procedure_types')
            .select('*')
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching procedure types:', error);
        throw error;
    }
}

/**
 * Get all procedure templates with their items
 */
export async function getProcedureTemplates(activeOnly: boolean = true): Promise<ProcedureTemplateWithItems[]> {
    try {
        let query = supabase
            .from('procedure_templates')
            .select(`
        *,
        procedure_type:procedure_types(*),
        items:procedure_template_items(*)
      `)
            .order('name');

        if (activeOnly) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching procedure templates:', error);
        throw error;
    }
}

/**
 * Get procedure templates by type
 */
export async function getProcedureTemplatesByType(procedureTypeId: string): Promise<ProcedureTemplateWithItems[]> {
    try {
        const { data, error } = await supabase
            .from('procedure_templates')
            .select(`
        *,
        procedure_type:procedure_types(*),
        items:procedure_template_items(*)
      `)
            .eq('procedure_type_id', procedureTypeId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching templates by type:', error);
        throw error;
    }
}

/**
 * Get a single procedure template with items
 */
export async function getProcedureTemplate(id: string): Promise<ProcedureTemplateWithItems | null> {
    try {
        const { data, error } = await supabase
            .from('procedure_templates')
            .select(`
        *,
        procedure_type:procedure_types(*),
        items:procedure_template_items(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching procedure template:', error);
        return null;
    }
}

/**
 * Create a new procedure template with items
 */
export async function createProcedureTemplate(
    template: Omit<ProcedureTemplate, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<ProcedureTemplateItem, 'id' | 'template_id'>[]
): Promise<ProcedureTemplateWithItems> {
    try {
        // Create template
        const { data: templateData, error: templateError } = await supabase
            .from('procedure_templates')
            .insert(template)
            .select()
            .single();

        if (templateError) throw templateError;

        // Create items
        if (items.length > 0) {
            const itemsToInsert = items.map(item => ({
                ...item,
                template_id: templateData.id
            }));

            const { error: itemsError } = await supabase
                .from('procedure_template_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        // Fetch complete template
        return await getProcedureTemplate(templateData.id) as ProcedureTemplateWithItems;
    } catch (error) {
        console.error('Error creating procedure template:', error);
        throw error;
    }
}

/**
 * Update a procedure template and its items
 */
export async function updateProcedureTemplate(
    id: string,
    template: Partial<Omit<ProcedureTemplate, 'id' | 'created_at' | 'updated_at'>>,
    items?: Omit<ProcedureTemplateItem, 'id' | 'template_id'>[]
): Promise<ProcedureTemplateWithItems> {
    try {
        // Update template
        const { error: templateError } = await supabase
            .from('procedure_templates')
            .update(template)
            .eq('id', id);

        if (templateError) throw templateError;

        // Update items if provided
        if (items !== undefined) {
            // Delete existing items
            await supabase
                .from('procedure_template_items')
                .delete()
                .eq('template_id', id);

            // Insert new items
            if (items.length > 0) {
                const itemsToInsert = items.map(item => ({
                    ...item,
                    template_id: id
                }));

                const { error: itemsError } = await supabase
                    .from('procedure_template_items')
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }
        }

        // Fetch updated template
        return await getProcedureTemplate(id) as ProcedureTemplateWithItems;
    } catch (error) {
        console.error('Error updating procedure template:', error);
        throw error;
    }
}

/**
 * Delete a procedure template
 */
export async function deleteProcedureTemplate(id: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('procedure_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting procedure template:', error);
        throw error;
    }
}

/**
 * Toggle template active status
 */
export async function toggleTemplateActive(id: string, isActive: boolean): Promise<void> {
    try {
        const { error } = await supabase
            .from('procedure_templates')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        console.error('Error toggling template status:', error);
        throw error;
    }
}
