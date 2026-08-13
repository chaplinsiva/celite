// agent-notes: { ctx: "Creator payout deduction and balance calculation helper", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-13" }

import { SupabaseClient } from "@supabase/supabase-js";

export interface CreatorBalanceSummary {
  marketplaceSales: number;
  subscriptionRevenue: number;
  grossEarnings: number;
  paidPayouts: number;
  pendingPayouts: number;
  totalDeductions: number;
  availableBalance: number;
}

/**
 * Calculates creator earnings, deductions (paid + pending payouts),
 * and available withdrawable balance for a given creator shop.
 *
 * 1. Gross Earnings = Marketplace Sales (80%) + Subscription Pool Revenue
 * 2. Deductions = Paid Payouts (status = 'paid') + Pending Payouts (status = 'pending')
 * 3. Available Balance = Max(0, Gross Earnings - Deductions)
 */
export async function calculateCreatorPayoutBalance(
  supabase: SupabaseClient,
  creatorShopId: string
): Promise<CreatorBalanceSummary> {
  // 1. Fetch all earnings for this creator shop
  const { data: earningsData, error: earningsError } = await supabase
    .from("creator_earnings")
    .select("creator_earning, earning_type")
    .eq("creator_shop_id", creatorShopId);

  if (earningsError) {
    console.error("Error fetching creator earnings:", earningsError);
  }

  let marketplaceSales = 0;
  let subscriptionRevenue = 0;
  let grossEarnings = 0;

  if (earningsData && earningsData.length > 0) {
    for (const record of earningsData) {
      const amt = Number(record.creator_earning) || 0;
      grossEarnings += amt;
      if (record.earning_type === "subscription") {
        subscriptionRevenue += amt;
      } else {
        // Default or 'marketplace'
        marketplaceSales += amt;
      }
    }
  }

  // 2. Fetch payout requests for deductions (paid + pending)
  const { data: payoutRequests, error: payoutsError } = await supabase
    .from("payout_requests")
    .select("amount, status")
    .eq("creator_shop_id", creatorShopId);

  if (payoutsError) {
    console.error("Error fetching creator payout requests:", payoutsError);
  }

  let paidPayouts = 0;
  let pendingPayouts = 0;

  if (payoutRequests && payoutRequests.length > 0) {
    for (const req of payoutRequests) {
      const status = (req.status || "").toLowerCase();
      const amt = Number(req.amount) || 0;

      if (status === "paid") {
        paidPayouts += amt;
      } else if (status === "pending") {
        pendingPayouts += amt;
      }
    }
  }

  const totalDeductions = paidPayouts + pendingPayouts;
  const availableBalance = Math.max(0, grossEarnings - totalDeductions);

  return {
    marketplaceSales: Number(marketplaceSales.toFixed(2)),
    subscriptionRevenue: Number(subscriptionRevenue.toFixed(2)),
    grossEarnings: Number(grossEarnings.toFixed(2)),
    paidPayouts: Number(paidPayouts.toFixed(2)),
    pendingPayouts: Number(pendingPayouts.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    availableBalance: Number(availableBalance.toFixed(2)),
  };
}
