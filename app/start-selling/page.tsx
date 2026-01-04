"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export default function StartSellingPage() {
  const router = useRouter();
  const { user } = useAppContext();

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");

  const [currentStep, setCurrentStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);

  const previewSlug = useMemo(() => {
    const base = slugify(
      slugInput || shopName || (user?.email.split("@")[0] ?? "")
    );
    return base || "your-shop";
  }, [slugInput, shopName, user]);

  // If user is not logged in, send them to login
  useEffect(() => {
    if (!user) {
      router.replace("/login?return=/start-selling");
    }
  }, [user, router]);

  // Load existing shop if any
  useEffect(() => {
    const loadExistingShop = async () => {
      if (!user) return;
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("creator_shops")
        .select(
          "name, description, slug, bank_account_name, bank_account_number, bank_ifsc, bank_upi_id"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;

      setShopName(data.name ?? "");
      setDescription(data.description ?? "");
      setExistingSlug(data.slug ?? null);
      setSlugInput(data.slug ?? "");
      setSlugManuallyEdited(!!data.slug);
      setBankAccountName(data.bank_account_name ?? "");
      setBankAccountNumber(data.bank_account_number ?? "");
      setBankIfsc(data.bank_ifsc ?? "");
      setBankUpiId(data.bank_upi_id ?? "");
    };

    loadExistingShop();
  }, [user]);

  // Keep slug in sync with name until the user edits it
  useEffect(() => {
    if (slugManuallyEdited) return;
    const base = slugify(shopName || (user?.email.split("@")[0] ?? ""));
    setSlugInput(base);
  }, [shopName, slugManuallyEdited, user]);

  const goToStep = (step: number) => {
    setError(null);
    setCurrentStep(step);
  };

  const handleStepAdvance = () => {
    setError(null);
    if (currentStep === 1) {
      const base = slugify(
        slugInput || shopName || (user?.email.split("@")[0] ?? "")
      );
      if (!shopName.trim()) {
        setError("Please enter a shop name.");
        return;
      }
      if (!base) {
        setError("Please enter a valid URL slug.");
        return;
      }
      setSlugInput(base);
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) {
      setError("Please log in to start selling.");
      return;
    }

    if (currentStep !== 3) {
      handleStepAdvance();
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the terms & conditions to continue.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setLoading(true);

    try {
      const baseSlug = slugify(
        slugInput || shopName || user.email.split("@")[0]
      );
      if (!baseSlug) {
        setError("Please enter a valid shop name.");
        setLoading(false);
        return;
      }

      // Ensure unique slug
      let finalSlug = baseSlug;
      if (!existingSlug || existingSlug !== baseSlug) {
        let suffix = 1;
        // Loop until we find a free slug OR it's our own existing record
        // (public read policy allows this)
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: existing } = await supabase
            .from("creator_shops")
            .select("id, user_id")
            .eq("slug", finalSlug)
            .maybeSingle();

          if (!existing || existing.user_id === user.id) {
            break;
          }

          suffix += 1;
          finalSlug = `${baseSlug}-${suffix}`;
        }
      } else {
        finalSlug = existingSlug;
      }

      const payload = {
        user_id: user.id,
        slug: finalSlug,
        name: shopName.trim(),
        description: description.trim() || null,
        bank_account_name: bankAccountName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_ifsc: bankIfsc.trim() || null,
        bank_upi_id: bankUpiId.trim() || null,
      };

      const { data, error } = await supabase
        .from("creator_shops")
        .upsert(payload, { onConflict: "user_id" })
        .select("slug")
        .maybeSingle();

      if (error || !data) {
        setError(error?.message || "Failed to save creator profile.");
        setLoading(false);
        return;
      }

      setExistingSlug(data.slug);
      setMessage("Creator profile saved! Redirecting to Creator Hub...");

      // Small delay so user can see the success message
      setTimeout(() => {
        router.push("/creator/dashboard");
      }, 800);
    } catch (err: any) {
      console.error("Error creating creator shop:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="bg-zinc-50 min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 mb-2">
          Start selling on Celite
        </h1>
        <p className="text-sm sm:text-base text-zinc-500 mb-6">
          Create your creator hub with a unique link like{" "}
          <span className="font-mono text-xs sm:text-sm text-zinc-700 bg-zinc-50 px-2 py-1 rounded">
            celite.in/{previewSlug}
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-3 text-sm font-semibold text-zinc-800">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 text-xs font-bold">
                {currentStep}
              </span>
              <div className="flex gap-2 text-xs text-zinc-500">
                <span className={currentStep >= 1 ? "font-semibold text-zinc-800" : ""}>
                  Basics
                </span>
                <span>→</span>
                <span className={currentStep >= 2 ? "font-semibold text-zinc-800" : ""}>
                  Payouts
                </span>
                <span>→</span>
                <span className={currentStep === 3 ? "font-semibold text-zinc-800" : ""}>
                  Review
                </span>
              </div>
            </div>
            <div className="text-xs text-zinc-500">
              Your page link:{" "}
              <span className="font-mono text-[11px] text-zinc-700">
                celite.in/{previewSlug}
              </span>
            </div>
          </div>

          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-800 mb-2">
                  Shop name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g., DT Studios"
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-800 mb-2">
                  URL slug
                </label>
                <div className="flex items-center gap-2 rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2">
                  <span className="text-sm text-zinc-500">celite.in/</span>
                  <input
                    type="text"
                    value={slugInput}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setSlugInput(slugify(e.target.value));
                    }}
                    placeholder="your-shop-name"
                    className="flex-1 bg-transparent outline-none text-sm text-zinc-900"
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Letters, numbers, and dashes only. You can change this anytime.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-zinc-800">
                    Description <span className="text-zinc-400">(optional)</span>
                  </label>
                  <span className="text-[11px] text-zinc-400">Optional</span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell buyers what you create and sell."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-800">
                  Payout details <span className="text-zinc-400">(optional)</span>
                </h2>
                <span className="text-xs text-zinc-500">
                  You can add or update these later in Creator Hub.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-800 mb-2">
                    Bank account name
                  </label>
                  <input
                    type="text"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="Name on bank account"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800 mb-2">
                    Bank account number
                  </label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Account number"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800 mb-2">
                    IFSC code
                  </label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="IFSC"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-800 mb-2">
                    UPI ID <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={bankUpiId}
                    onChange={(e) => setBankUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
                You can skip payout setup now and add it later from Creator Hub
                → Payouts before receiving withdrawals.
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="font-semibold text-zinc-900">Review</div>
                  <div className="text-xs text-zinc-500">
                    Public page: celite.in/{previewSlug}
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  You can edit any details later in Creator Hub.
                </p>
              </div>

              <label className="flex items-start gap-3 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <span className="leading-relaxed text-[13px] sm:text-sm">
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="text-blue-600 underline underline-offset-2"
                  >
                    Terms & Conditions
                  </a>{" "}
                  including: every new shop or template may be reviewed for at
                  least 24 hours before selling goes live; I am responsible for
                  any consequences from policy violations (removal, refunds,
                  payout holds, or account suspension); I retain ownership of my
                  templates and grant Celite rights to list and deliver them; and
                  revenue is split 65% creator / 35% Celite on eligible sales.
                </span>
              </label>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          {message && (
            <p className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-xl px-4 py-2">
              {message}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => goToStep(currentStep - 1)}
                className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <div className="flex items-center gap-3">
                {currentStep === 2 && (
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="inline-flex items-center rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-all"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleStepAdvance}
                  className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all"
                >
                  Continue
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {loading
                  ? "Saving..."
                  : existingSlug
                  ? "Onboard as seller"
                  : "Onboard as seller"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}


