// Currency utility functions
// Supports both INR (₹) and USD ($) formatting

export type Currency = 'INR' | 'USD';

export function getCurrencySymbol(currency: Currency = 'INR'): string {
  return currency === 'USD' ? '$' : '₹';
}

export function formatPrice(amount: number, currency: Currency = 'INR'): string {
  const symbol = getCurrencySymbol(currency);
  if (currency === 'USD') {
    return `${symbol}${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `${symbol}${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatPriceWithDecimal(amount: number, currency: Currency = 'INR'): string {
  const symbol = getCurrencySymbol(currency);
  if (currency === 'USD') {
    return `${symbol}${amount.toFixed(2)}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}
