// Currency utility functions
// Note: Prices in database are already in INR, so we just format them

export function formatPrice(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatPriceWithDecimal(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

