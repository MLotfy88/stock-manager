import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 1. Get Supabase URL and Key from environment variables
// Vite exposes env variables on `import.meta.env`
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// 2. Check if the environment variables are set
if (!supabaseUrl || !supabaseKey) {
  // Log an error to the console if variables are missing.
  // The app will not function correctly without them.
  console.error("Supabase URL and/or Key are not set in environment variables.");
  console.error("Please create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_KEY for local development.");
}

// 3. Create a single Supabase client instance
let supabaseInstance: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Error creating Supabase client:", error);
  }
}

// 4. Export a function to get the singleton instance
export const getSupabaseClient = (): SupabaseClient | null => {
  return supabaseInstance;
};

// The test function remains the same as it's for dynamically testing credentials
// from the settings page, not for the main app client.
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
