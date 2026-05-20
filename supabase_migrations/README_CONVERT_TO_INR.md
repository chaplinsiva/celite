# Convert Database Prices from USD to INR

This migration converts all prices in the database from USD to INR (Indian Rupees).

## Exchange Rate
- 1 USD = 83 INR

## Migration Steps

1. **Run the SQL Migration**:
   - Open your Supabase Dashboard
   - Go to SQL Editor
   - Copy and paste the contents of `convert_usd_to_inr.sql`
   - Click "Run" to execute the migration

2. **What Gets Updated**:
   - `templates.price` - All template prices (USD * 83 → INR)
   - `order_items.price` - All order item prices (USD * 83 → INR)
   - `orders.total` - All order totals (USD * 83 → INR)

3. **Important Notes**:
   - Prices are now stored directly in INR in the database
   - The application code has been updated to display INR (₹) by default
   - No currency conversion is needed in the code anymore - prices are already in INR

## Example Conversion
- $10 → ₹830
- $19 → ₹1,577
- $100 → ₹8,300

## Verification

After running the migration, verify the prices:
```sql
SELECT name, price FROM templates LIMIT 5;
```

All prices should now be in INR values (approximately 83x the original USD values).

