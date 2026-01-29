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
  // Slack notifier disabled by user request
  return;
};
