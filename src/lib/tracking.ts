import { getSupabaseClient } from './supabaseClient';
import { User } from '@supabase/supabase-js';

interface TrackingDetails {
  [key: string]: any;
}

export const trackEvent = async (
  eventName: string,
  user: User | null,
  details: TrackingDetails = {}
) => {
  if (!user) {
    console.log('Tracking event skipped: No user session.');
    return;
  }

  const userData = {
    email: user.email,
    role: user.app_metadata?.userrole || 'user',
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('Supabase client not available for tracking event.');
    return;
  }

  try {
    const { error } = await supabase.functions.invoke('slack-notifier', {
      body: {
        event: eventName,
        user: userData,
        details,
      },
    });

    if (error) {
      // Diagnostic logging for user
      if (error instanceof Error) {
        if (error.message.includes('FunctionsHttpError')) {
          console.warn('Tracking Service: Edge Function Invocation Failed. Check Supabase Edge Function logs for details (500/404/400).');
        } else {
          console.warn(`Tracking Service Warning: ${error.message}`);
        }
      } else {
        console.warn('Tracking Service Warning: Unknown error occurred during event tracking.');
      }
    }
  } catch (error: any) {
    console.warn('Tracking Failed (Network/Client Error):', error.message || 'Unknown error');
  }
};
