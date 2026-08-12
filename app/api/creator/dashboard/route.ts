// agent-notes: { ctx: "Creator dashboard API returning earnings, deductions, balance, and payout history", deps: ["lib/payouts.ts", "lib/supabaseServer.ts"], state: active, last: "sato@2026-08-12" }

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { calculateCreatorPayoutBalance } from "@/lib/payouts";

export async function GET() {
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

    // Fetch creator shop for logged in user
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

    // Calculate balance with paid/pending payout deductions
    const balanceSummary = await calculateCreatorPayoutBalance(supabase, shop.id);

    // Fetch past payout requests
    const { data: payoutHistory } = await supabase
      .from("creator_payout_requests")
      .select("*")
      .eq("creator_shop_id", shop.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      shop,
      balanceSummary,
      payoutHistory: payoutHistory || [],
    });
  } catch (error: any) {
    console.error("Creator Dashboard API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
