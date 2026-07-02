// Canonical price conversion utilities for Celite
// ALL price values in the settings DB are stored in the smallest currency unit:
//   - INR: paise (e.g., 79900 = ₹799)
//   - USD: cents (e.g., 900 = $9.00)
// These functions provide the ONLY way to convert between units.
// Do NOT use ad-hoc thresholds (>= 1000, < 100, etc.) anywhere else.

/**
 * Convert a price from the smallest currency unit to the display unit.
 * For INR: paise → rupees (79900 → 799)
 * For USD: cents → dollars (900 → 9)
 */
export function toDisplayAmount(smallestUnit: number): number {
  return Math.round(smallestUnit / 100);
}

/**
 * Convert a price from display unit to the smallest currency unit.
 * For INR: rupees → paise (799 → 79900)
 * For USD: dollars → cents (9 → 900)
 */
export function toSmallestUnit(displayAmount: number): number {
  return Math.round(displayAmount * 100);
}

/**
 * Alias: Convert paise to INR (rupees).
 */
export const paiseToINR = toDisplayAmount;

/**
 * Alias: Convert INR (rupees) to paise.
 */
export const inrToPaise = toSmallestUnit;

/**
 * Alias: Convert cents to USD (dollars).
 */
export const centsToDollars = toDisplayAmount;

/**
 * Alias: Convert USD (dollars) to cents.
 */
export const dollarsToCents = toSmallestUnit;
