// agent-notes: { ctx: "Admin payouts API for listing and processing creator payout requests", deps: ["lib/payouts.ts", "lib/supabaseAdmin.ts"], state: active, last: "sato@2026-08-13" }

import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { calculateCreatorPayoutBalance } from "@/lib/payouts";

export async function GET(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin user
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const userId = userRes.user.id;
    const { data: isAdmin } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Fetch creator payout requests
    const { data: requests, error: reqError } = await admin
      .from("payout_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (reqError) {
      return NextResponse.json({ ok: false, error: reqError.message }, { status: 500 });
    }

    // Fetch all creator shops for joining details
    const { data: shops } = await admin
      .from("creator_shops")
      .select("id, name, bank_account_name, bank_account_number, bank_ifsc, bank_upi_id, user_id");

    const shopMap = new Map<string, any>();
    if (shops) {
      for (const s of shops) {
        shopMap.set(s.id, s);
      }
    }

    // Cache creator balance calculations to optimize listing
    const balanceCache = new Map<string, any>();

    const enrichedRequests = await Promise.all(
      (requests || []).map(async (payout) => {
        const shop = shopMap.get(payout.creator_shop_id) || {};
        let balance = balanceCache.get(payout.creator_shop_id);

        if (!balance && payout.creator_shop_id) {
          balance = await calculateCreatorPayoutBalance(admin, payout.creator_shop_id);
          balanceCache.set(payout.creator_shop_id, balance);
        }

        return {
          ...payout,
          creator_shop_name: shop.name || "Unknown Shop",
          bank_account_name: shop.bank_account_name || null,
          bank_account_number: shop.bank_account_number || null,
          bank_ifsc: shop.bank_ifsc || null,
          bank_upi_id: shop.bank_upi_id || null,
          balance_summary: balance || null,
        };
      })
    );

    return NextResponse.json({ ok: true, requests: enrichedRequests });
  } catch (e: any) {
    console.error("Admin payouts GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin user
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const adminUserId = userRes.user.id;
    const { data: isAdmin } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", adminUserId)
      .maybeSingle();

    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const requestId = (body?.requestId || "").toString().trim();
    const status = (body?.status || "").toString().trim().toLowerCase(); // 'paid' | 'rejected'
    const adminNote = (body?.adminNote || "").toString().trim();

    if (!requestId) {
      return NextResponse.json({ ok: false, error: "Missing requestId" }, { status: 400 });
    }

    if (!["paid", "rejected"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid status. Status must be 'paid' or 'rejected'." },
        { status: 400 }
      );
    }

    const processedAt = new Date().toISOString();

    const { error: updateError } = await admin
      .from("payout_requests")
      .update({
        status,
        admin_note: adminNote || null,
        processed_at: processedAt,
      })
      .eq("id", requestId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    // Dual-sync update to creator_payout_requests table if present
    try {
      await admin
        .from("creator_payout_requests")
        .update({
          status,
          admin_note: adminNote || null,
          admin_user_id: adminUserId,
          processed_at: processedAt,
        })
        .eq("id", requestId);
    } catch (e) {
      // Ignore if secondary table sync fails
    }

    return NextResponse.json({
      ok: true,
      message: `Payout request successfully marked as ${status}.`,
    });
  } catch (e: any) {
    console.error("Admin payouts POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
