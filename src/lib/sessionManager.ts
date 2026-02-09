import { getSupabaseClient } from '@/lib/supabaseClient';

/**
 * Ensures the current Supabase session is valid before critical operations.
 * Proactively refreshes the session if it's about to expire (< 5 minutes remaining).
 * 
 * @returns true if session is valid or successfully refreshed, false otherwise
 */
export const ensureValidSession = async (): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
        console.error('Supabase client not initialized');
        return false;
    }

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Error getting session:', sessionError);
            return false;
        }

        if (!session) {
            console.warn('No active session');
            return false;
        }

        // Check expiry (JWT exp is in seconds, Date.now() is in ms)
        const expiresAt = (session.expires_at || 0) * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const FIVE_MINUTES = 5 * 60 * 1000;

        // Proactive refresh if expiring soon
        if (timeUntilExpiry < FIVE_MINUTES) {
            console.log('Session expiring soon, refreshing proactively...');
            const { data, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError) {
                console.error('Session refresh failed:', refreshError);
                return false;
            }

            if (!data.session) {
                console.error('Session refresh returned no session');
                return false;
            }

            console.log('Session refreshed successfully');
            return true;
        }

        // Session is valid and has time remaining
        return true;
    } catch (error) {
        console.error('Unexpected error in ensureValidSession:', error);
        return false;
    }
};

/**
 * Wrapper for async operations that ensures session validity before execution.
 * Automatically refreshes session if needed.
 * 
 * @param operation The async function to execute
 * @param operationName Name of the operation (for error reporting)
 * @returns Result of the operation
 * @throws Error if session is invalid or operation fails
 */
export async function withSessionCheck<T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation'
): Promise<T> {
    const isValid = await ensureValidSession();

    if (!isValid) {
        const error: any = new Error('Session expired or invalid');
        error.code = 'AUTH_SESSION_EXPIRED';
        error.hint = 'Please log in again to continue';
        error.operation = operationName;
        throw error;
    }

    try {
        return await operation();
    } catch (error: any) {
        // Enhance error with operation context
        if (!error.operation) {
            error.operation = operationName;
        }
        throw error;
    }
}
