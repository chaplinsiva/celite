import { getSupabaseAdminClient } from './supabaseAdmin';

type RazorpayCreds = { key_id: string; key_secret: string; currency: string; monthly_amount: number; yearly_amount: number };

export async function getRazorpayCreds(): Promise<RazorpayCreds> {
  const supabase = getSupabaseAdminClient();
  const settings: Record<string, string> = {};
  try {
    const { data } = await supabase.from('settings').select('key,value');
    (data ?? []).forEach((row: any) => { settings[row.key] = row.value; });
  } catch {}
  const key_id = settings.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '';
  const key_secret = settings.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  const currency = settings.RAZORPAY_CURRENCY || process.env.RAZORPAY_CURRENCY || 'INR';
  // Amounts should be in paise (INR * 100) for Razorpay API
  // Monthly: ₹799 = 79900 paise, Yearly: ₹5,499 = 549900 paise
  let monthly_amount = Number(settings.RAZORPAY_MONTHLY_AMOUNT || process.env.RAZORPAY_MONTHLY_AMOUNT || 79900);
  let yearly_amount = Number(settings.RAZORPAY_YEARLY_AMOUNT || process.env.RAZORPAY_YEARLY_AMOUNT || 549900);
  
  // Monthly: if < 10000, it's in rupees, convert to paise (multiply by 100)
  // Yearly: if < 100000, it's in rupees, convert to paise (multiply by 100)
  // Otherwise, it's already in paise, use as is
  if (monthly_amount < 10000) {
    monthly_amount = monthly_amount * 100;
  }
  if (yearly_amount < 100000) {
    yearly_amount = yearly_amount * 100;
  }
  
  if (!key_id || !key_secret) throw new Error('Missing Razorpay credentials');
  return { key_id, key_secret, currency, monthly_amount, yearly_amount };
}

export async function razorpayRequest(path: string, options: { method?: string; body?: any } = {}) {
  const { key_id, key_secret } = await getRazorpayCreds();
  const auth = Buffer.from(`${key_id}:${key_secret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return await res.json();
}


