import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = localStorage.getItem('supabaseUrl');
  const supabaseKey = localStorage.getItem('supabaseKey');

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
      return supabaseInstance;
    } catch (error) {
      console.error("Error creating Supabase client:", error);
      return null;
    }
  }
  
  return null;
};

interface ConnectionResult {
  success: boolean;
  tables?: string[];
  error?: string;
}

export const testSupabaseConnection = async (url: string, key: string): Promise<ConnectionResult> => {
  try {
    const testClient = createClient(url, key);
    
    // Attempt to fetch tables from the public schema
    const { data, error } = await testClient
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      // Handle specific auth errors vs. general network errors
      if (error.message.includes('JWT') || error.message.includes('key')) {
        return { success: false, error: 'Invalid API Key.' };
      }
      return { success: false, error: error.message };
    }

    if (data) {
      const tableNames = data.map((table: any) => table.table_name);
      return { success: true, tables: tableNames };
    }

    return { success: false, error: 'Could not retrieve tables.' };

  } catch (e: any) {
    return { success: false, error: e.message || 'A network error occurred.' };
  }
};
