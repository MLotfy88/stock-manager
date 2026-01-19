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
      // console.warn('Tracking event failed (silent):', error.message);
    }
  } catch (error) {
    // console.warn('Failed to invoke tracking function (silent).');
  }
};
