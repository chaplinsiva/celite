import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { getRazorpayCreds, razorpayRequest } from '../../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }
    const { key_secret } = await getRazorpayCreds();
    const hmac = crypto.createHmac('sha256', key_secret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = hmac.digest('hex');
    if (digest !== razorpay_signature) {
      return NextResponse.json({ ok: false, error: 'Signature mismatch' }, { status: 400 });
    }

    // Fetch order to retrieve product notes
    const order = await razorpayRequest(`/orders/${razorpay_order_id}`);
    const notes = order?.notes || {};
    const slug = notes.slug as string | undefined;
    const name = notes.name as string | undefined;
    const price = Number(notes.price || 0);
    const img = notes.img as string | undefined;
    let userId = notes.user_id as string | undefined;

    const admin = getSupabaseAdminClient();

    // If user_id wasn't in notes, try to get it from the authorization token
    if (!userId) {
      const auth = req.headers.get('authorization') || '';
      const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
      if (!token) {
        return NextResponse.json({ ok: false, error: 'Missing authorization token' }, { status: 401 });
      }
      
      // First try: decode JWT token directly to extract user ID
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          // Base64 decode the payload (might need padding)
          let payloadStr = parts[1];
          while (payloadStr.length % 4) payloadStr += '=';
          const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString());
          if (payload.sub) userId = payload.sub;
        }
      } catch {}
      
      // Fallback: try admin.auth.getUser to get valid user
      if (!userId) {
        try {
          const { data: me, error: meErr } = await admin.auth.getUser(token);
          if (!meErr && me?.user?.id) {
            userId = me.user.id;
          }
        } catch {}
      }
    }

    if (!userId) return NextResponse.json({ ok: false, error: 'Unable to identify user' }, { status: 401 });

    // Verify user exists in auth.users before inserting order
    try {
      const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
      if (userErr || !userData?.user) {
        return NextResponse.json({ ok: false, error: `User ${userId} does not exist` }, { status: 400 });
      }
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: `Failed to verify user: ${e?.message}` }, { status: 400 });
    }

    // Record order in DB
    const { data: dbOrder, error: oErr } = await admin
      .from('orders')
      .insert({ user_id: userId, total: price, status: 'paid' })
      .select('id')
      .single();
    if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });
    if (slug && name) {
      await admin.from('order_items').insert({ order_id: dbOrder.id, slug, name, price, quantity: 1, img });
    }
    return NextResponse.json({ ok: true, order_id: dbOrder.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify error' }, { status: 500 });
  }
}


