import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { getRazorpayCreds, razorpayRequest } from '../../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    if (token) {
      // Try to decode JWT token directly to extract user ID
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          if (payload.sub) userId = payload.sub;
          if (payload.email) userEmail = payload.email;
        }
      } catch {}
      // Fallback: try admin.auth.getUser to get full user details
      if (!userId) {
        try {
          const { data: me } = await admin.auth.getUser(token);
          if (me?.user?.id) {
            userId = me.user.id;
            userEmail = me.user.email || null;
            const metadata = me.user.user_metadata as any;
            if (metadata?.first_name && metadata?.last_name) {
              userName = `${metadata.first_name} ${metadata.last_name}`.trim();
            } else if (metadata?.first_name) {
              userName = metadata.first_name;
            } else if (userEmail) {
              userName = userEmail.split('@')[0];
            }
          }
        } catch {}
      }
    }
    
    const { key_id } = await getRazorpayCreds();
    const body = await req.json();
    const { amount, product, billing } = body;
    if (!amount || !product?.slug) return NextResponse.json({ ok: false, error: 'Missing amount or product' }, { status: 400 });

    // Use billing info from request if provided, otherwise fallback to user data
    const billingName = billing?.name || userName || '';
    const billingEmail = billing?.email || userEmail || '';
    const billingMobile = billing?.mobile || '';

    // Build a short receipt (Razorpay requires <= 40 chars)
    const shortSlug = String(product.slug || '').replace(/[^a-zA-Z0-9\-_.]/g, '').slice(0, 20);
    const shortTs = Date.now().toString().slice(-8);
    let receipt = `rcpt_${shortSlug}_${shortTs}`;
    if (receipt.length > 40) receipt = receipt.slice(0, 40);

    const payload: any = {
      amount: Math.round(Number(amount)), // amount in paise (INR * 100)
      currency: 'INR', // Always use INR
      receipt,
      notes: {
        slug: product.slug,
        name: product.name || '',
        price: String(product.price || ''),
        img: product.img || '',
        user_id: userId || '', // Store user_id in notes
        customer_email: billingEmail,
        customer_name: billingName,
        customer_mobile: billingMobile,
        billing_name: billingName,
        billing_email: billingEmail,
        billing_mobile: billingMobile,
        billing_company: billing?.company || '',
      },
    };

    // Note: Razorpay orders don't support a 'customer' field
    // Customer information is stored in notes instead
    const order = await razorpayRequest('/orders', { method: 'POST', body: payload });
    return NextResponse.json({ ok: true, key: key_id, order });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Razorpay error' }, { status: 500 });
  }
}


