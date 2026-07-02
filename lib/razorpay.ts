import { getSupabaseAdminClient } from './supabaseAdmin';

type RazorpayCreds = {
  key_id: string;
  key_secret: string;
  currency: string;
  monthly_amount: number;   // INR amount in paise
  yearly_amount: number;    // INR amount in paise
  monthly_amount_usd: number; // USD amount in cents
  yearly_amount_usd: number;  // USD amount in cents
};

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

  // All amounts are stored in the smallest currency unit (paise for INR, cents for USD)
  // No ad-hoc conversion heuristics — values from DB are always in smallest unit
  const monthly_amount = Number(settings.RAZORPAY_MONTHLY_AMOUNT || process.env.RAZORPAY_MONTHLY_AMOUNT || 79900);
  const yearly_amount = Number(settings.RAZORPAY_YEARLY_AMOUNT || process.env.RAZORPAY_YEARLY_AMOUNT || 549900);
  const monthly_amount_usd = Number(settings.RAZORPAY_MONTHLY_AMOUNT_USD || process.env.RAZORPAY_MONTHLY_AMOUNT_USD || 900);  // $9 = 900 cents
  const yearly_amount_usd = Number(settings.RAZORPAY_YEARLY_AMOUNT_USD || process.env.RAZORPAY_YEARLY_AMOUNT_USD || 5900);    // $59 = 5900 cents

  if (!key_id || !key_secret) throw new Error('Missing Razorpay credentials');
  return { key_id, key_secret, currency, monthly_amount, yearly_amount, monthly_amount_usd, yearly_amount_usd };
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


