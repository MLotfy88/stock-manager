import { getSupabaseClient } from '@/lib/supabaseClient';
import { SignInCredentials } from '@/types';

/**
 * Sign in a user with email and password.
 */
export const signIn = async ({ email, password }: SignInCredentials) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign in error:', error.message);
    throw error;
  }

  return data;
};

/**
 * Sign out the current user.
 */
export const signOut = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error.message);
    throw error;
  }
};

/**
 * Get the current user session.
 */
export const getSession = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Get session error:', error.message);
    throw error;
  }

  return data.session;
};

/**
 * Listen for authentication state changes.
 */
export const onAuthStateChange = (callback: (session: any) => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return subscription;
};
