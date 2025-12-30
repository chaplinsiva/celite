"use client";

import { getSupabaseBrowserClient } from "../../../lib/supabaseClient";

type TemplateRow = {
  slug: string;
  name: string;
  img: string | null;
  video?: string | null;
  vendor_name?: string | null;
  creator_shop_id?: string | null;
  status?: string | null;
};

export default function VendorApprovalPanel({
  templates,
  onReviewed,
}: {
  templates: TemplateRow[];
  onReviewed: () => Promise<void> | void;
}) {
  const vendorTemplates = (templates || []).filter(
    (t) => t.creator_shop_id || t.vendor_name
  );

  const pendingFirst = [...vendorTemplates].sort((a, b) => {
    const aPending = a.status === "pending";
    const bPending = b.status === "pending";
    if (aPending && !bPending) return -1;
    if (!aPending && bPending) return 1;
    return 0;
  });

  const handleReview = async (
    slug: string,
    status: "approved" | "rejected"
  ) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/admin/templates/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug, status }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        await onReviewed();
      }
    } catch (e) {
      console.error("Failed to review template", e);
    }
  };

  const getStatusMeta = (status?: string | null) => {
    if (status === "pending") {
      return {
        label: "Pending review",
        className: "bg-amber-50 text-amber-700 border-amber-100",
      };
    }
    if (status === "rejected") {
      return {
        label: "Rejected",
        className: "bg-red-50 text-red-700 border-red-100",
      };
    }
    return {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border-emerald-100",
    };
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Vendor Approval</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Review and approve templates submitted by creators.
          </p>
        </div>
      </header>

      {pendingFirst.length === 0 ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
          No vendor templates to review right now.
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pendingFirst.map((t) => {
            const vendor = t.vendor_name || "Unknown vendor";
            const { label, className } = getStatusMeta(t.status);

            return (
              <li
                key={t.slug}
                className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <h3
                    className="text-sm font-semibold text-zinc-900 truncate"
                    title={t.name}
                  >
                    {t.name}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {t.slug}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Vendor:{" "}
                    <span className="font-medium text-zinc-700">{vendor}</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${className}`}
                  >
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    {t.status !== "approved" && (
                      <button
                        type="button"
                        onClick={() => handleReview(t.slug, "approved")}
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-[11px] font-medium hover:bg-emerald-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {t.status !== "rejected" && (
                      <button
                        type="button"
                        onClick={() => handleReview(t.slug, "rejected")}
                        className="rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-[11px] font-medium hover:bg-red-100 transition-colors"
                      >
                        Decline
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}


