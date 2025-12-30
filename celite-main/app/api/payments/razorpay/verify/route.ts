import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { getRazorpayCreds, razorpayRequest } from '../../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, billing, cartItems } = body;
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
    let userId = notes.user_id as string | undefined;
    
    // For multiple items, calculate total from cartItems
    let totalAmount = 0;
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      totalAmount = cartItems.reduce((sum: number, item: any) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);
    } else {
      // Single product fallback
      totalAmount = Number(notes.price || 0);
    }

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

    // Get billing info from request or notes
    const billingName = billing?.name || notes.billing_name || notes.customer_name || '';
    const billingEmail = billing?.email || notes.billing_email || notes.customer_email || '';
    const billingMobile = billing?.mobile || notes.billing_mobile || notes.customer_mobile || '';
    const billingCompany = billing?.company || notes.billing_company || null;

    // Record order in DB with billing details including mobile
    const { data: dbOrder, error: oErr } = await admin
      .from('orders')
      .insert({ 
        user_id: userId, 
        total: totalAmount, 
        status: 'paid',
        billing_name: billingName || null,
        billing_email: billingEmail || null,
        billing_mobile: billingMobile || null,
        billing_company: billingCompany || null,
      })
      .select('id')
      .single();
    if (oErr) return NextResponse.json({ ok: false, error: oErr.message }, { status: 500 });

    // Update checkout_details if razorpay_order_id exists
    if (razorpay_order_id && dbOrder?.id) {
      try {
        await admin
          .from('checkout_details')
          .update({
            status: 'completed',
            razorpay_payment_id: razorpay_payment_id || null,
            order_id: dbOrder.id,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpay_order_id)
          .eq('user_id', userId);
      } catch (e) {
        // Don't fail the payment verification if checkout_details update fails
        console.error('Failed to update checkout_details:', e);
      }
    }

    // Insert order items - handle multiple cart items
    if (cartItems && Array.isArray(cartItems) && cartItems.length > 0) {
      const orderItems = cartItems.map((item: any) => ({
        order_id: dbOrder.id,
        slug: item.slug,
        name: item.name,
        price: Number(item.price) || 0,
        quantity: 1,
        img: item.img || '',
      }));
      await admin.from('order_items').insert(orderItems);
    } else {
      // Fallback for single product
      const slug = notes.slug as string | undefined;
      const name = notes.name as string | undefined;
      const img = notes.img as string | undefined;
    if (slug && name) {
        await admin.from('order_items').insert({ 
          order_id: dbOrder.id, 
          slug, 
          name, 
          price: totalAmount, 
          quantity: 1, 
          img: img || '' 
        });
    }
    }
    
    // Extract slug and name from notes for single product fallback
    const slug = notes.slug as string | undefined;
    const name = notes.name as string | undefined;
    
    return NextResponse.json({ 
      ok: true, 
      order_id: dbOrder.id,
      total: totalAmount,
      items: cartItems && Array.isArray(cartItems) && cartItems.length > 0
        ? cartItems.map((item: any) => ({
            item_id: item.slug,
            item_name: item.name,
            price: Number(item.price) || 0,
            quantity: 1,
          }))
        : slug && name
        ? [{
            item_id: slug,
            item_name: name,
            price: totalAmount,
            quantity: 1,
          }]
        : []
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Verify error' }, { status: 500 });
  }
}


