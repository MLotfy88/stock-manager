
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
