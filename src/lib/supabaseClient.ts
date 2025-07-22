import { createClient } from '@supabase/supabase-js';

const supabaseUrl = localStorage.getItem('supabaseUrl');
const supabaseKey = localStorage.getItem('supabaseKey');

// Check if the URL and Key exist. If not, we can't create a client.
// The application should handle this gracefully, perhaps by redirecting
// to the settings page or showing a warning.
if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL or Key is not set in localStorage.");
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
