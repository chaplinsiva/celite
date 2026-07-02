import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    const templatesCount = await admin.from('templates').select('*', { count: 'exact', head: true });
    const ordersAgg = await admin.from('orders').select('total');
    const orders = (ordersAgg.data || []) as Array<{ total: number }>;
    const revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    
    // Calculate subscription revenue pool and distribution
    let totalSubscriptionRevenue = 0;
    let vendorPoolAmount = 0;
    let celiteAmount = 0;
    
    try {
      // Get subscription prices from settings
      let monthlyPrice = 799; // Default
      let yearlyPrice = 5499; // Default
      
      const { data: settings } = await admin.from('settings').select('key,value');
      if (settings) {
        const settingsMap: Record<string, string> = {};
        settings.forEach((row: any) => { settingsMap[row.key] = row.value; });
        
        const monthlyPaise = Number(settingsMap.RAZORPAY_MONTHLY_AMOUNT || 79900);
        const yearlyPaise = Number(settingsMap.RAZORPAY_YEARLY_AMOUNT || 549900);
        
        // Convert from paise to INR (if >= threshold, it's in paise)
        monthlyPrice = monthlyPaise >= 10000 ? monthlyPaise / 100 : monthlyPaise;
        yearlyPrice = yearlyPaise >= 100000 ? yearlyPaise / 100 : yearlyPaise;
      }
      
      const nowIso = new Date().toISOString();
      
      // Count active monthly/weekly subscriptions
      const { count: activeMonthly } = await admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
        .in('plan', ['monthly', 'weekly']);
      
      // Count active yearly subscriptions
      const { count: activeYearly } = await admin
        .from('subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .or(`valid_until.is.null,valid_until.gt.${nowIso}`)
        .eq('plan', 'yearly');

      totalSubscriptionRevenue = (activeMonthly || 0) * monthlyPrice + (activeYearly || 0) * yearlyPrice;
      
      // Calculate revenue distribution: 40% to vendors, 60% to Celite
      vendorPoolAmount = totalSubscriptionRevenue * 0.4;
      celiteAmount = totalSubscriptionRevenue * 0.6;
    } catch (e) {
      console.log('Could not calculate subscription revenue distribution', e);
    }
    
    return NextResponse.json({ 
      ok: true, 
      data: { 
        templates: templatesCount.count || 0, 
        orders: orders.length, 
        revenue,
        totalSubscriptionRevenue: Number(totalSubscriptionRevenue.toFixed(2)),
        vendorPoolAmount: Number(vendorPoolAmount.toFixed(2)),
        celiteAmount: Number(celiteAmount.toFixed(2)),
      } 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}


