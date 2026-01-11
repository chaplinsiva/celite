import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const body = await req.json();
    const {
      checkout_type,
      billing_name,
      billing_email,
      billing_mobile,
      billing_company,
      subscription_plan,
      cart_items,
      total_amount,
      razorpay_order_id,
    } = body;

    // Validate required fields
    if (!billing_name || !billing_email || !billing_mobile || !total_amount) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Insert checkout details
    const { data: checkoutDetail, error: insertErr } = await admin
      .from('checkout_details')
      .insert({
        user_id: userId,
        checkout_type: checkout_type || 'product',
        billing_name,
        billing_email,
        billing_mobile,
        billing_company: billing_company || null,
        subscription_plan: subscription_plan || null,
        cart_items: cart_items || [],
        total_amount: Number(total_amount) || 0,
        status: 'initiated',
        razorpay_order_id: razorpay_order_id || null,
      })
      .select('id')
      .single();

    if (insertErr) {
      return NextResponse.json({ ok: false, error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, checkout_detail_id: checkoutDetail.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

// Update checkout details (e.g., when payment is initiated or completed)
export async function PATCH(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }
    const userId = userRes.user.id;

    const body = await req.json();
    const { checkout_detail_id, status, razorpay_order_id, razorpay_payment_id, razorpay_subscription_id, order_id } = body;

    if (!checkout_detail_id) {
      return NextResponse.json({ ok: false, error: 'Missing checkout_detail_id' }, { status: 400 });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (razorpay_order_id) updateData.razorpay_order_id = razorpay_order_id;
    if (razorpay_payment_id) updateData.razorpay_payment_id = razorpay_payment_id;
    if (razorpay_subscription_id) updateData.razorpay_subscription_id = razorpay_subscription_id;
    if (order_id) updateData.order_id = order_id;

    // Update checkout details
    const { error: updateErr } = await admin
      .from('checkout_details')
      .update(updateData)
      .eq('id', checkout_detail_id)
      .eq('user_id', userId); // Ensure user can only update their own checkout details

    if (updateErr) {
      return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}






