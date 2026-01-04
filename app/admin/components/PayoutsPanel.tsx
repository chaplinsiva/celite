"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";

type PayoutRow = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  processed_at: string | null;
  creator_shop_id: string;
  user_id: string;
  creator_shops?: {
    name?: string | null;
    slug?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    bank_ifsc?: string | null;
    bank_upi_id?: string | null;
  } | null;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
];

export default function PayoutsPanel() {
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("No session");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/admin/payouts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to load payout requests");
        setRows([]);
      } else {
        setRows(json.requests || []);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load payout requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError("No session");
        setSavingId(null);
        return;
      }
      const res = await fetch("/api/admin/payouts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to update status");
      } else {
        setRows((prev) =>
          prev.map((row) =>
            row.id === id ? { ...row, status, processed_at: status === "completed" ? new Date().toISOString() : null } : row
          )
        );
      }
    } catch (e: any) {
      setError(e?.message || "Failed to update status");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="bg-white border border-zinc-200 rounded-3xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Vendor Payouts</h2>
          <p className="text-sm text-zinc-500">
            Review withdrawal requests and mark them Pending, Processing, or Completed to notify creators.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
          {error}
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="text-sm text-zinc-500 bg-zinc-50 border border-dashed border-zinc-200 rounded-xl px-4 py-6">
          No payout requests yet.
        </div>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Creator</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Bank / UPI</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((row) => {
                const shop = row.creator_shops;
                return (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-zinc-900">{shop?.name || "Creator"}</div>
                      <div className="text-xs text-zinc-500">/{shop?.slug || "—"}</div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-zinc-900">₹{Number(row.amount || 0).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-3">
                      <select
                        className="border border-zinc-200 rounded-lg px-2 py-1 text-sm"
                        value={row.status}
                        onChange={(e) => updateStatus(row.id, e.target.value)}
                        disabled={savingId === row.id}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-500">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      {row.processed_at && (
                        <div className="text-[11px] text-green-600">
                          Done: {new Date(row.processed_at).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-zinc-600">
                      {shop?.bank_account_name && <div>{shop.bank_account_name}</div>}
                      {shop?.bank_account_number && <div>{shop.bank_account_number}</div>}
                      {shop?.bank_ifsc && <div>IFSC: {shop.bank_ifsc}</div>}
                      {shop?.bank_upi_id && <div>UPI: {shop.bank_upi_id}</div>}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-zinc-500">
                      {row.status === "pending" && <span className="text-amber-600 font-semibold">Requires action</span>}
                      {row.status === "processing" && <span className="text-blue-600 font-semibold">Processing</span>}
                      {row.status === "completed" && <span className="text-green-600 font-semibold">Completed</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

