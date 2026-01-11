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
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankUpiId, setBankUpiId] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingSlug, setExistingSlug] = useState<string | null>(null);

  const previewSlug = useMemo(() => {
    if (existingSlug) return existingSlug;
    const base = slugify(shopName || (user?.email.split("@")[0] ?? ""));
    return base || "your-shop";
  }, [shopName, existingSlug, user]);

  // If user is not logged in, send them to login
  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/start-selling");
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
      setBankAccountName(data.bank_account_name ?? "");
      setBankAccountNumber(data.bank_account_number ?? "");
      setBankIfsc(data.bank_ifsc ?? "");
      setBankUpiId(data.bank_upi_id ?? "");
    };

    loadExistingShop();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!user) {
      setError("Please log in to start selling.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setLoading(true);

    try {
      const baseSlug = slugify(shopName || user.email.split("@")[0]);
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
      setMessage("Creator profile saved! Your page is ready.");

      // Small delay so user can see the success message
      setTimeout(() => {
        router.push(`/${data.slug}`);
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
            <p className="mt-1 text-xs text-zinc-500">
              This controls your public name and URL slug.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell buyers what you create and sell."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
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
                UPI ID (optional)
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

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-zinc-500">
              Your public page will be:
              <span className="ml-1 font-mono text-[11px] text-zinc-700">
                celite.in/{previewSlug}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Saving..." : existingSlug ? "Update shop" : "Create shop"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}


