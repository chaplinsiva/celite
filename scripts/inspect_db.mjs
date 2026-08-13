// agent-notes: { ctx: "Scratch script to inspect local/remote database fields", deps: [], state: active, last: "sato@2026-08-13" }
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL || 'https://rmrdchkemlhseriqjgit.supabase.co';
const key = env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

async function main() {
  const { data: checkouts } = await supabase
    .from('checkout_details')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  console.log('=== COMPLETED CHECKOUTS BY MONTH ===');
  const monthGroup = {};
  (checkouts || []).forEach(c => {
    const monthKey = c.created_at ? c.created_at.slice(0, 7) : 'unknown';
    if (!monthGroup[monthKey]) {
      monthGroup[monthKey] = {
        count: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        yearlyRevenue: 0,
        autopayRevenue: 0,
        manualRevenue: 0,
        plans: {},
      };
    }
    const g = monthGroup[monthKey];
    const amt = Number(c.total_amount || 0);
    g.count++;
    g.totalRevenue += amt;
    if (c.subscription_plan === 'yearly') g.yearlyRevenue += amt;
    else g.monthlyRevenue += amt;

    if (c.razorpay_subscription_id || c.autopay_enabled) g.autopayRevenue += amt;
    else g.manualRevenue += amt;

    g.plans[c.subscription_plan || 'unknown'] = (g.plans[c.subscription_plan || 'unknown'] || 0) + 1;
  });

  console.log(JSON.stringify(monthGroup, null, 2));

  console.log('\n=== SUBSCRIPTIONS BY CREATED_AT MONTH ===');
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  const subMonthGroup = {};
  (subs || []).forEach(s => {
    const monthKey = s.created_at ? s.created_at.slice(0, 7) : 'unknown';
    if (!subMonthGroup[monthKey]) subMonthGroup[monthKey] = 0;
    subMonthGroup[monthKey]++;
  });
  console.log(JSON.stringify(subMonthGroup, null, 2));
}

main().catch(console.error);
