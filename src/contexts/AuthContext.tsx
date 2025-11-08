import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSession, onAuthStateChange } from '@/data/operations/authOperations';
import { trackEvent } from '@/lib/tracking';
import { getSupabaseClient } from '@/lib/supabaseClient';

// Extend the User type to include our custom profile data
export type UserWithProfile = User & {
  profile: {
    role: string;
  } | null;
};

interface AuthContextType {
  session: Session | null;
  user: UserWithProfile | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const fetchUserAndProfile = async (currentUser: User | null): Promise<UserWithProfile | null> => {
      if (!currentUser) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return { ...currentUser, profile: null };
      }
      
      return { ...currentUser, profile };
    };

    const handleAuthChange = async (newSession: Session | null) => {
      const userWithProfile = await fetchUserAndProfile(newSession?.user ?? null);
      
      // Track login event only when a session is newly created
      if (!session && newSession) {
        trackEvent('User Logged In', userWithProfile);
      }

      setSession(newSession);
      setUser(userWithProfile);
      setIsLoading(false);
    };

    // Fetch initial session
    getSession().then(currentSession => {
      handleAuthChange(currentSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
