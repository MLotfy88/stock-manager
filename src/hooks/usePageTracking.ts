import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { trackEvent } from '@/lib/tracking';

export const usePageTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      trackEvent('Page Viewed', user, { path: location.pathname });
    }
  }, [location.pathname, user]);
};
