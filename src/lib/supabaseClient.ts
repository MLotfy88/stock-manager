import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  let supabaseUrl = localStorage.getItem('supabaseUrl');
  let supabaseKey = localStorage.getItem('supabaseKey');

  // Fallback to hardcoded values if not found in localStorage
  if (!supabaseUrl || !supabaseKey) {
    supabaseUrl = 'https://hmpsdmovolevivkqkhba.supabase.co';
    supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtcHNkbW92b2xldml2a3FraGJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwNjE2NDEsImV4cCI6MjA2OTYzNzY0MX0.c3lvcvGO55ursK-Kiq1T2iIZSuXAYlgKXNdLZmagHnE';
  }


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
    
    // Call the RPC function to get table names
    const { data, error } = await testClient.rpc('get_public_tables');

    if (error) {
      // Handle specific auth errors vs. general network errors
      if (error.message.includes('JWT') || error.message.includes('key')) {
        return { success: false, error: 'Invalid API Key.' };
      }
      if (error.message.includes('does not exist')) {
        return { success: false, error: 'Function get_public_tables() not found. Please run the latest SQL script from the Management page.' };
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
