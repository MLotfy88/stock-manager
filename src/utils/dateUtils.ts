
// Helper functions for date operations

/**
 * Get the status based on expiry date
 */
export const getStatus = (expiryDate: string): 'valid' | 'expiring_soon' | 'expired' => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 90) return 'expiring_soon';
  return 'valid';
};

/**
 * Generate expiry date for demonstration purposes
 */
export const generateExpiryDate = (monthsAhead: number): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + monthsAhead);
  return date.toISOString().split('T')[0];
};

/**
 * Calculates the time elapsed since a given date and returns a formatted string.
 */
export const timeSince = (date: Date, lang: 'en' | 'ar' = 'en'): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;

  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (interval > 1) {
    return rtf.format(-Math.floor(interval), 'year');
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return rtf.format(-Math.floor(interval), 'month');
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return rtf.format(-Math.floor(interval), 'day');
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return rtf.format(-Math.floor(interval), 'hour');
  }
  interval = seconds / 60;
  if (interval > 1) {
    return rtf.format(-Math.floor(interval), 'minute');
  }
  return rtf.format(-Math.floor(seconds), 'second');
};
