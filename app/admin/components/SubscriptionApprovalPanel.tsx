"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabaseClient";
import { convertR2UrlToCdn } from "../../../lib/utils";
import { Check, X, ExternalLink, ShieldCheck, Clock, AlertCircle } from "lucide-react";

type SubscriptionTemplateRow = {
  slug: string;
  name: string;
  img: string | null;
  video?: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  price?: number | null;
  vendor_name?: string | null;
  creator_shop_id?: string | null;
  status?: string | null;
  subscription_submission_status?: string | null;
  available_on_celite_subscription?: boolean | null;
  created_at?: string | null;
};

export default function SubscriptionApprovalPanel() {
  const [templates, setTemplates] = useState<SubscriptionTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingSlug, setProcessingSlug] = useState<string | null>(null);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("templates")
        .select(
          "slug, name, img, video, video_path, thumbnail_path, price, vendor_name, creator_shop_id, status, subscription_submission_status, available_on_celite_subscription, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching templates for subscription review:", error);
      } else {
        setTemplates((data as SubscriptionTemplateRow[]) || []);
      }
    } catch (e) {
      console.error("Failed to load subscription approval templates:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleReview = async (slug: string, status: "APPROVED" | "REJECTED") => {
    try {
      setProcessingSlug(slug);
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setFeedback("Authentication error. Please log in again.");
        return;
      }

      const res = await fetch("/api/admin/subscription/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug, status }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setFeedback(`Asset ${slug} set to ${status}.`);
        await fetchTemplates();
      } else {
        setFeedback(json.error || "Failed to process review.");
      }
    } catch (e: any) {
      console.error("Failed to review subscription template:", e);
      setFeedback("Error submitting review.");
    } finally {
      setProcessingSlug(null);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const pendingCount = templates.filter(
    (t) => t.subscription_submission_status === "PENDING_REVIEW"
  ).length;

  const approvedCount = templates.filter(
    (t) => t.subscription_submission_status === "APPROVED" || t.available_on_celite_subscription === true
  ).length;

  const rejectedCount = templates.filter(
    (t) => t.subscription_submission_status === "REJECTED"
  ).length;

  const filteredTemplates = templates.filter((t) => {
    // Filter by submission status tab
    if (filter === "PENDING") {
      if (t.subscription_submission_status !== "PENDING_REVIEW") return false;
    } else if (filter === "APPROVED") {
      if (t.subscription_submission_status !== "APPROVED" && t.available_on_celite_subscription !== true)
        return false;
    } else if (filter === "REJECTED") {
      if (t.subscription_submission_status !== "REJECTED") return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesName = t.name?.toLowerCase().includes(q);
      const matchesSlug = t.slug?.toLowerCase().includes(q);
      const matchesVendor = t.vendor_name?.toLowerCase().includes(q);
      if (!matchesName && !matchesSlug && !matchesVendor) return false;
    }

    return true;
  });

  const getStatusBadge = (t: SubscriptionTemplateRow) => {
    const subStatus = t.subscription_submission_status;
    const isSubAvailable = t.available_on_celite_subscription;

    if (subStatus === "PENDING_REVIEW") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3 h-3" />
          Pending Review
        </span>
      );
    }
    if (subStatus === "APPROVED" || isSubAvailable === true) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3" />
          Sub Approved
        </span>
      );
    }
    if (subStatus === "REJECTED") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" />
          Sub Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
        Not Requested
      </span>
    );
  };

  const getThumbnail = (t: SubscriptionTemplateRow) => {
    if (t.thumbnail_path) return convertR2UrlToCdn(t.thumbnail_path) || t.thumbnail_path;
    if (t.img) return convertR2UrlToCdn(t.img) || t.img;
    return "/PNG1.png";
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900">Celite Subscription Approvals</h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Sole review authority for adding marketplace creator templates to the <strong>Celite.in Subscription Pool</strong>.
          </p>
        </div>

        <button
          onClick={fetchTemplates}
          className="self-start sm:self-auto px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
        >
          Refresh List
        </button>
      </header>

      {feedback && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-blue-600 hover:text-blue-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 self-start">
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === "PENDING"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter("APPROVED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === "APPROVED"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Approved ({approvedCount})
          </button>
          <button
            onClick={() => setFilter("REJECTED")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === "REJECTED"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              filter === "ALL"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            All ({templates.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by title, slug, or vendor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 text-xs border border-zinc-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
        />
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-500">
          Loading subscription requests...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-zinc-600">No subscription templates match the current filter.</p>
          {filter === "PENDING" && (
            <p className="text-xs text-zinc-400 mt-1">Great job! All pending subscription requests have been reviewed.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTemplates.map((t) => {
            const isProcessing = processingSlug === t.slug;
            const vendor = t.vendor_name || "Unknown Creator";
            const priceDisplay = t.price ? `₹${t.price}` : "₹0";

            return (
              <div
                key={t.slug}
                className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-zinc-100 mb-3 border border-zinc-100">
                    <img
                      src={getThumbnail(t)}
                      alt={t.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 z-10">{getStatusBadge(t)}</div>
                  </div>

                  {/* Template Info */}
                  <h3 className="text-sm font-bold text-zinc-900 truncate" title={t.name}>
                    {t.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">{t.slug}</p>

                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-100 pt-2">
                    <span className="truncate">
                      Creator: <strong className="text-zinc-800">{vendor}</strong>
                    </span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Market Price: {priceDisplay}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                  {/* External Market Preview Button */}
                  <a
                    href={`https://celitemarket.in/product/${t.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-3 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Preview on Celite Market
                    <ExternalLink className="w-3 h-3 text-zinc-400" />
                  </a>

                  {/* Review Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReview(t.slug, "APPROVED")}
                      className={`flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all active:scale-[0.98] ${
                        isProcessing ? "opacity-50 cursor-wait" : ""
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Pool
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleReview(t.slug, "REJECTED")}
                      className={`py-2 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.98] ${
                        isProcessing ? "opacity-50 cursor-wait" : ""
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
