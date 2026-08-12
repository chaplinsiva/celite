// agent-notes: { ctx: "Admin payout panel component for reviewing and processing creator payouts", deps: ["lib/supabaseClient.ts", "lib/utils.ts"], state: active, last: "sato@2026-08-12" }

"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface PayoutRequestRow {
  id: string;
  creator_shop_id: string;
  user_id: string;
  amount: number;
  status: "pending" | "paid" | "rejected" | string;
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  creator_shop_name?: string;
  bank_account_name?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bank_upi_id?: string | null;
  balance_summary?: {
    marketplaceSales: number;
    subscriptionRevenue: number;
    grossEarnings: number;
    paidPayouts: number;
    pendingPayouts: number;
    totalDeductions: number;
    availableBalance: number;
  } | null;
}

export default function AdminPayoutPanel() {
  const [requests, setRequests] = useState<PayoutRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "rejected">("pending");
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequestRow | null>(null);
  const [actionStatus, setActionStatus] = useState<"paid" | "rejected">("paid");
  const [adminNote, setAdminNote] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchPayoutRequests = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setErrorMessage("Unauthorized session. Please log in as admin.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/payouts", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setRequests(json.requests || []);
      } else {
        setErrorMessage(json.error || "Failed to load payout requests.");
      }
    } catch (e: any) {
      console.error("Error fetching admin payouts:", e);
      setErrorMessage(e.message || "Network error loading payouts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutRequests();
  }, []);

  const handleProcessAction = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;

      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          status: actionStatus,
          adminNote,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setSuccessMessage(json.message || `Payout request marked as ${actionStatus}.`);
        setSelectedRequest(null);
        setAdminNote("");
        await fetchPayoutRequests();
      } else {
        setErrorMessage(json.error || "Failed to process payout request.");
      }
    } catch (e: any) {
      console.error("Error updating payout request:", e);
      setErrorMessage(e.message || "Failed to update payout request.");
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filter === "all") return true;
    return r.status.toLowerCase() === filter;
  });

  const pendingCount = requests.filter((r) => r.status.toLowerCase() === "pending").length;
  const pendingTotal = requests
    .filter((r) => r.status.toLowerCase() === "pending")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const paidCount = requests.filter((r) => r.status.toLowerCase() === "paid").length;
  const paidTotal = requests
    .filter((r) => r.status.toLowerCase() === "paid")
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">💰 Creator Payout Management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review, approve, and process creator payout requests using strict available balance rules.
          </p>
        </div>
        <button
          onClick={fetchPayoutRequests}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Refreshing..." : "🔄 Refresh Payouts"}
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-xs font-medium text-red-700">
          ⚠️ {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs font-medium text-emerald-700">
          ✅ {successMessage}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Pending Requests ({pendingCount})
          </div>
          <div className="mt-2 text-2xl font-black text-amber-900">
            ₹{pendingTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-amber-600">
            Deducted immediately from creator withdrawable balance
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Total Paid Payouts ({paidCount})
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-900">
            ₹{paidTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 text-[11px] text-emerald-600">
            Processed & settled payouts
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 backdrop-blur-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Calculation Rule
          </div>
          <div className="mt-2 text-xs font-bold text-blue-900">
            Available = Gross - (Paid + Pending)
          </div>
          <div className="mt-1 text-[11px] text-blue-600 leading-relaxed">
            Marketplace Sales (80%) + Subscription Revenue - Paid/Pending Deductions
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 border-b border-zinc-200 pb-3">
        {(["pending", "all", "paid", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-semibold capitalize transition-all",
              filter === tab
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900"
            )}
          >
            {tab} {tab === "pending" ? `(${pendingCount})` : tab === "paid" ? `(${paidCount})` : ""}
          </button>
        ))}
      </div>

      {/* Table / List */}
      {loading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Loading creator payout requests...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          No payout requests found under filter "{filter}".
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-4 py-3.5">Creator / Shop</th>
                <th className="px-4 py-3.5">Requested Amount</th>
                <th className="px-4 py-3.5">Bank / UPI Info</th>
                <th className="px-4 py-3.5">Earnings & Balance</th>
                <th className="px-4 py-3.5">Status & Date</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {filteredRequests.map((req) => {
                const bal = req.balance_summary;
                const statusLower = req.status.toLowerCase();

                return (
                  <tr key={req.id} className="hover:bg-zinc-50/80 transition-colors">
                    {/* Creator / Shop */}
                    <td className="px-4 py-4 align-top">
                      <div className="font-bold text-zinc-900">{req.creator_shop_name}</div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{req.creator_shop_id}</div>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4 align-top">
                      <div className="text-base font-black text-zinc-900">
                        ₹{Number(req.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Bank / UPI */}
                    <td className="px-4 py-4 align-top max-w-xs">
                      {req.bank_upi_id ? (
                        <div>
                          <span className="font-semibold text-zinc-900">UPI:</span>{" "}
                          <span className="font-mono text-blue-600">{req.bank_upi_id}</span>
                        </div>
                      ) : null}

                      {req.bank_account_number ? (
                        <div className="mt-1 space-y-0.5 text-[11px]">
                          <div>
                            <span className="text-zinc-500">Holder:</span> {req.bank_account_name || "N/A"}
                          </div>
                          <div>
                            <span className="text-zinc-500">A/C:</span>{" "}
                            <span className="font-mono text-zinc-800">{req.bank_account_number}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">IFSC:</span>{" "}
                            <span className="font-mono text-zinc-800">{req.bank_ifsc}</span>
                          </div>
                        </div>
                      ) : !req.bank_upi_id ? (
                        <span className="text-zinc-400 italic">No bank info provided</span>
                      ) : null}
                    </td>

                    {/* Earnings & Balance Breakdown */}
                    <td className="px-4 py-4 align-top">
                      {bal ? (
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1.5 text-zinc-600">
                            <span>Gross:</span>
                            <span className="font-semibold text-zinc-900">₹{bal.grossEarnings.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500">
                            <span>Deductions:</span>
                            <span className="font-semibold text-red-600">
                              -₹{bal.totalDeductions.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              (Paid ₹{bal.paidPayouts} + Pend ₹{bal.pendingPayouts})
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                            <span>Available:</span>
                            <span>₹{bal.availableBalance.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">N/A</span>
                      )}
                    </td>

                    {/* Status & Dates */}
                    <td className="px-4 py-4 align-top space-y-1">
                      <div>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            statusLower === "pending"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : statusLower === "paid"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          )}
                        >
                          {statusLower}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Req: {new Date(req.created_at).toLocaleDateString("en-IN")}
                      </div>
                      {req.processed_at && (
                        <div className="text-[10px] text-zinc-400">
                          Proc: {new Date(req.processed_at).toLocaleDateString("en-IN")}
                        </div>
                      )}
                      {req.admin_note && (
                        <div className="mt-1 text-[10px] italic text-zinc-500 bg-zinc-50 p-1.5 rounded border border-zinc-200 max-w-xs">
                          "{req.admin_note}"
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 align-top text-right space-y-1.5">
                      {statusLower === "pending" ? (
                        <div className="flex flex-col gap-1.5 items-end">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionStatus("paid");
                              setAdminNote("");
                            }}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm"
                          >
                            Mark as Paid
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setActionStatus("rejected");
                              setAdminNote("");
                            }}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedRequest(req);
                            setActionStatus(statusLower === "paid" ? "rejected" : "paid");
                            setAdminNote(req.admin_note || "");
                          }}
                          className="text-[11px] text-zinc-500 hover:text-zinc-900 underline"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Action Form */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900">
              {actionStatus === "paid" ? "Approve Payout (Mark as Paid)" : "Reject Payout Request"}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              Creator: <span className="font-semibold text-zinc-800">{selectedRequest.creator_shop_name}</span>
              <br />
              Amount: <span className="font-bold text-zinc-900">₹{selectedRequest.amount}</span>
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Admin Note / Remarks (Optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  actionStatus === "paid"
                    ? "Transaction Reference ID or UTR number..."
                    : "Reason for rejection..."
                }
                rows={3}
                className="w-full rounded-xl border border-zinc-300 p-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                disabled={processing}
                className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessAction}
                disabled={processing}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50",
                  actionStatus === "paid"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                )}
              >
                {processing ? "Processing..." : actionStatus === "paid" ? "Confirm Paid" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
