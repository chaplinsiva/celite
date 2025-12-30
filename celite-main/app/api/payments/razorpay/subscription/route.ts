import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { getRazorpayCreds, razorpayRequest } from '../../../../../lib/razorpay';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { plan, currency: reqCurrency, billing } = body; // { plan: 'monthly' | 'yearly', currency?: 'USD' | 'INR', billing?: {...} }
    if (!plan || (plan !== 'monthly' && plan !== 'yearly')) {
      return NextResponse.json({ ok: false, error: 'Invalid plan. Must be "monthly" or "yearly"' }, { status: 400 });
    }
    
    // Get user details for customer creation
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName: string | null = null;
    
    // Use billing info if provided, otherwise get from token
    if (billing) {
      userEmail = billing.email || null;
      userName = billing.name || null;
      if (billing.mobile) {
        // Mobile can be stored in notes
      }
    }
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          if (payload.sub) userId = payload.sub;
          if (!userEmail && payload.email) userEmail = payload.email;
        }
      } catch {}
      
      if (!userId || !userEmail) {
        try {
          const { data: me } = await admin.auth.getUser(token);
          if (me?.user?.id) {
            userId = me.user.id;
            if (!userEmail) userEmail = me.user.email || null;
            const metadata = me.user.user_metadata as any;
            if (!userName) {
            if (metadata?.first_name && metadata?.last_name) {
              userName = `${metadata.first_name} ${metadata.last_name}`.trim();
            } else if (metadata?.first_name) {
              userName = metadata.first_name;
            } else if (userEmail) {
              userName = userEmail.split('@')[0];
              }
            }
          }
        } catch {}
      }
    }
    
    let { key_id, currency, monthly_amount, yearly_amount } = await getRazorpayCreds();
    
    const isYearly = plan === 'yearly';
    const amount = isYearly ? yearly_amount : monthly_amount;
    const period = isYearly ? 'yearly' : 'monthly';

    // Create or get customer in Razorpay
    let customerId: string | null = null;
    if (userEmail || userName) {
      try {
        // Create customer with details
        // Razorpay will handle duplicate emails by returning existing customer or creating new one
        const customerData: any = {};
        if (userEmail) customerData.email = userEmail;
        if (userName) customerData.name = userName;
        if (userId) customerData.notes = { user_id: userId };
        
        const customer = await razorpayRequest('/customers', {
          method: 'POST',
          body: customerData,
        });
        customerId = customer.id;
      } catch (e: any) {
        // If customer already exists, try to extract error or create with different approach
        console.error('Error creating customer:', e);
        // Continue without customer if creation fails - subscription will work without customer_id
      }
    }

    // Create plan with correct period
    const createdPlan = await razorpayRequest('/plans', {
      method: 'POST',
      body: { 
        period, 
        interval: 1, 
        item: { 
          name: `Celite ${plan} Plan`, 
          amount, 
          currency 
        } 
      },
    });

    // Create subscription
    // For monthly: 120 cycles = 120 months = 10 years
    // For yearly: 10 cycles = 10 years
    const totalCount = isYearly ? 10 : 120;
    
    const subscriptionBody: any = {
      plan_id: createdPlan.id, 
      total_count: totalCount, 
      customer_notify: 1,
      notes: {
        user_id: userId || '',
      },
    };
    
    // Add customer details to notes
    if (userEmail) subscriptionBody.notes.customer_email = userEmail;
    if (userName) subscriptionBody.notes.customer_name = userName;
    if (billing) {
      subscriptionBody.notes.billing_name = billing.name || '';
      subscriptionBody.notes.billing_email = billing.email || '';
      subscriptionBody.notes.billing_mobile = billing.mobile || '';
      subscriptionBody.notes.billing_company = billing.company || '';
    }
    
    // Add customer_id if we have one
    if (customerId) {
      subscriptionBody.customer_id = customerId;
    }
    
    const subscription = await razorpayRequest('/subscriptions', {
      method: 'POST',
      body: subscriptionBody,
    });
    return NextResponse.json({ ok: true, subscription: { ...subscription, razorpay_key: key_id } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Subscription error' }, { status: 500 });
  }
}


