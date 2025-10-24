/**
 * Format price with proper currency display
 * @param amount - The price amount (number or string)
 * @param currency - The currency code (e.g., 'USD', 'INR')
 * @returns Formatted price string
 */
export const formatPrice = (amount: number | string | undefined, currency: string = 'USD'): string => {
  if (amount === undefined || amount === null) return '';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return '';
  
  // For USD, show $ symbol, for others show currency code
  if (currency === 'USD') {
    return `$${numericAmount.toFixed(2)}`;
  } else {
    return `${numericAmount.toFixed(2)} ${currency}`;
  }
};
