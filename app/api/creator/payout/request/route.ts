// agent-notes: { ctx: "Creator payout request API with available balance deduction validation", deps: ["lib/payouts.ts", "lib/supabaseServer.ts"], state: active, last: "sato@2026-08-13" }

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { calculateCreatorPayoutBalance } from "@/lib/payouts";

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const requestAmount = Number(body.amount);

    if (isNaN(requestAmount) || requestAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payout request amount. Amount must be greater than zero." },
        { status: 400 }
      );
    }

    // Fetch creator shop
    const { data: shop, error: shopError } = await supabase
      .from("creator_shops")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (shopError || !shop) {
      return NextResponse.json(
        { error: "Creator shop not found" },
        { status: 404 }
      );
    }

    // 1. Gross Earnings = Marketplace Sales (80%) + Subscription Pool Revenue
    // 2. Deductions = Paid Payouts + Pending Payouts
    // 3. Available Balance = Max(0, Gross Earnings - Deductions)
    const { availableBalance } = await calculateCreatorPayoutBalance(supabase, shop.id);

    // 4. Verify request amount <= Available Balance
    if (requestAmount > availableBalance) {
      return NextResponse.json(
        {
          error: `Requested payout amount (₹${requestAmount}) exceeds your available withdrawable balance of ₹${availableBalance.toFixed(2)}. Note that pending payouts deduct immediately from available balance.`,
          availableBalance,
        },
        { status: 400 }
      );
    }

    // Insert payout request into payout_requests
    const { data: newRequest, error: insertError } = await supabase
      .from("payout_requests")
      .insert({
        creator_shop_id: shop.id,
        user_id: user.id,
        amount: requestAmount,
        bank_account_name: shop.bank_account_name || null,
        bank_account_number: shop.bank_account_number || null,
        bank_ifsc: shop.bank_ifsc || null,
        bank_upi_id: shop.bank_upi_id || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating payout request:", insertError);
      return NextResponse.json(
        { error: "Failed to submit payout request" },
        { status: 500 }
      );
    }

    // Dual-sync to creator_payout_requests table for backward compatibility if present
    try {
      await supabase.from("creator_payout_requests").insert({
        creator_shop_id: shop.id,
        user_id: user.id,
        amount: requestAmount,
        status: "pending",
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Ignore if secondary table sync fails
    }

    const remainingBalance = Math.max(0, availableBalance - requestAmount);

    return NextResponse.json({
      success: true,
      message: "Payout request submitted successfully",
      payoutRequest: newRequest,
      remainingAvailableBalance: Number(remainingBalance.toFixed(2)),
    });
  } catch (error: any) {
    console.error("Payout request API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
