import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["pending", "processing", "completed"] as const;

async function requireAdmin(req: Request) {
  const admin = getSupabaseAdminClient();
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : null;
  if (!token) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes.user) {
    return { error: NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 }) };
  }

  const userId = userRes.user.id;
  const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!isAdmin) {
    return { error: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }) };
  }

  return { admin };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const { data, error } = await admin
      .from("creator_payout_requests")
      .select(
        `
        id,
        amount,
        status,
        created_at,
        processed_at,
        creator_shop_id,
        user_id,
        creator_shops (
          name,
          slug,
          bank_account_name,
          bank_account_number,
          bank_ifsc,
          bank_upi_id
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, requests: data ?? [] });
  } catch (e: any) {
    console.error("Admin payouts GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    const status = (body?.status || "").toString().trim().toLowerCase();
    if (!id || !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json({ ok: false, error: "Invalid id or status" }, { status: 400 });
    }

    const update: Record<string, any> = { status };
    if (status === "completed") {
      update.processed_at = new Date().toISOString();
    } else {
      update.processed_at = null;
    }

    const { error } = await admin
      .from("creator_payout_requests")
      .update(update)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Admin payouts PATCH error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}

