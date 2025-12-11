"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseBrowserClient } from "../../../lib/supabaseClient";

type CreatorShop = {
  slug: string;
  name: string;
  description: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_ifsc: string | null;
  bank_upi_id: string | null;
};

type CreatorTemplateRow = {
  slug: string;
  name: string;
  subtitle: string | null;
  video: string | null;
  created_at: string | null;
  downloadCount: number;
  status?: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
};

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useAppContext();

  const [shop, setShop] = useState<CreatorShop | null>(null);
  const [templates, setTemplates] = useState<CreatorTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [totalDownloads, setTotalDownloads] = useState<number>(0);
  const [uniqueUserPeriods, setUniqueUserPeriods] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);

  const [formOpen, setFormOpen] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    subtitle: "",
    video: "",
    source_path: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    features: "",
    software: "",
    plugins: "",
    tags: "",
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<
    Subcategory[]
  >([]);

  const resetForm = () => {
    setForm({
      name: "",
      slug: "",
      subtitle: "",
      video: "",
      source_path: "",
      description: "",
      category_id: "",
      subcategory_id: "",
      features: "",
      software: "",
      plugins: "",
      tags: "",
    });
    setSlugManuallyEdited(false);
  };

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      const res = await fetch("/api/creator/templates", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to load creator data.");
        setLoading(false);
        return;
      }

      setShop(json.shop);
      setTemplates(json.templates || []);
      if (json.stats) {
        setTotalDownloads(json.stats.totalDownloads ?? 0);
        setUniqueUserPeriods(json.stats.uniqueUserPeriods ?? 0);
        setRevenue(json.stats.revenue ?? 0);
      } else {
        const fallbackDownloads = (json.templates || []).reduce(
          (sum: number, t: any) => sum + (t.downloadCount || 0),
          0
        );
        setTotalDownloads(fallbackDownloads);
        setUniqueUserPeriods(0);
        setRevenue(0);
      }

      if (!json.shop) {
        // No shop yet – send to onboarding
        router.replace("/start-selling");
        return;
      }
      // Load categories / subcategories for template form
      try {
        const { data: cats } = await supabase
          .from("categories")
          .select("id,name,slug")
          .order("name");
        const { data: subs } = await supabase
          .from("subcategories")
          .select("id,category_id,name,slug")
          .order("name");
        setCategories((cats as any) || []);
        setSubcategories((subs as any) || []);
        setFilteredSubcategories((subs as any) || []);
      } catch (e) {
        console.error("Failed to load categories/subcategories for creator", e);
      }
    } catch (e: any) {
      console.error("Failed to load creator dashboard:", e);
      setError(e?.message || "Failed to load creator dashboard.");
    } finally {
      setLoading(false);
    }
  }, [user, router]);

  // Keep filtered subcategories in sync with selected category
  useEffect(() => {
    if (form.category_id) {
      const filtered = subcategories.filter(
        (s) => s.category_id === form.category_id
      );
      setFilteredSubcategories(filtered);
      if (
        form.subcategory_id &&
        !filtered.find((s) => s.id === form.subcategory_id)
      ) {
        setForm((f) => ({ ...f, subcategory_id: "" }));
      }
    } else {
      setFilteredSubcategories(subcategories);
      setForm((f) => ({ ...f, subcategory_id: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category_id, subcategories]);

  useEffect(() => {
    if (!user) {
      router.replace("/login?redirect=/creator/dashboard");
      return;
    }
    loadData();
  }, [user, loadData, router]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      const slug = (form.slug || generateSlug(form.name)).trim().toLowerCase();
      if (!slug) {
        setError("Please enter a name to generate a slug.");
        setSaving(false);
        return;
      }

      const payload = {
        template: {
          name: form.name,
          slug,
          subtitle: form.subtitle,
          description: form.description,
          video: form.video,
          source_path: form.source_path,
          features: form.features
            ? form.features
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          software: form.software
            ? form.software
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          plugins: form.plugins
            ? form.plugins
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          tags: form.tags
            ? form.tags
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          category_id: form.category_id || null,
          subcategory_id: form.subcategory_id || null,
        },
      };

      const res = await fetch("/api/creator/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to save template.");
        setSaving(false);
        return;
      }

      setMessage("Template saved!");
      resetForm();
      setFormOpen(false);
      await loadData();
    } catch (e: any) {
      console.error("Failed to create template:", e);
      setError(e?.message || "Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (slug: string) => {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    setError(null);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?redirect=/creator/dashboard");
        return;
      }

      const res = await fetch("/api/creator/templates", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Failed to delete template.");
        return;
      }

      setMessage("Template deleted.");
      await loadData();
    } catch (e: any) {
      console.error("Failed to delete template:", e);
      setError(e?.message || "Failed to delete template.");
    }
  };

  const [active, setActive] = useState<"overview" | "templates" | "settings">(
    "overview"
  );

  if (!user) {
    return null;
  }

  if (loading && !shop) {
    return (
      <main className="bg-zinc-50 min-h-screen text-zinc-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm text-center">
          <p className="text-sm text-zinc-500">
            Loading your creator dashboard...
          </p>
        </div>
      </main>
    );
  }

  const getStatusLabel = (status?: string | null) => {
    if (!status || status === "approved") return "Approved";
    if (status === "pending") return "Pending review";
    if (status === "rejected") return "Rejected";
    return status;
  };

  return (
    <main className="bg-zinc-50 min-h-screen text-zinc-900 flex flex-col font-sans">
      {/* Creator Navbar (similar to admin navbar) */}
      <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-6 bg-white sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none hover:opacity-80 transition-opacity"
          >
            <img
              src="/logo/logo.png"
              alt="Celite Logo"
              className="h-8 w-auto object-contain"
            />
            <span className="font-bold text-xl tracking-tight text-zinc-900">
              Celite{" "}
              <span className="text-zinc-500 font-normal text-sm ml-1">
                Creator
              </span>
            </span>
          </Link>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100"
        >
          Back to Dashboard
        </Link>
      </header>

      <div className="flex-1 grid grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="border-r border-zinc-200 bg-white px-4 py-6 space-y-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.18em] mb-2">
            Creator Panel
          </div>
          <nav className="space-y-1 text-sm">
            <button
              type="button"
              onClick={() => setActive("overview")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                active === "overview"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActive("templates")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                active === "templates"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              My Templates
            </button>
            <button
              type="button"
              onClick={() => setActive("settings")}
              className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                active === "settings"
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              Settings
            </button>
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex flex-col h-full overflow-hidden">
          <section className="flex-1 p-6 sm:p-8 space-y-6 overflow-y-auto">
            {/* Top header card shared across tabs */}
            <section className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="uppercase tracking-[0.18em] text-[10px] font-semibold text-blue-600">
                    Creator Dashboard
                  </p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-900">
                    {shop?.name || "Your Creator Hub"}
                  </h1>
                  {shop?.description && (
                    <p className="mt-1 text-sm text-zinc-500 max-w-xl">
                      {shop.description}
                    </p>
                  )}
                </div>
                {shop && (
                  <div className="text-right space-y-2">
                    <p className="text-xs text-zinc-500 font-medium">
                      Public page
                    </p>
                    <Link
                      href={`/${shop.slug}`}
                      target="_blank"
                      className="inline-flex items-center rounded-full bg-zinc-900 text-white px-4 py-2 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      celite.in/{shop.slug}
                    </Link>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => router.push("/start-selling")}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Edit shop &amp; bank details
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Alerts */}
            {(error || message) && (
              <div className="space-y-2">
                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-2xl">
                    {error}
                  </div>
                )}
                {message && (
                  <div className="bg-green-50 border border-green-100 text-green-700 text-sm px-4 py-3 rounded-2xl">
                    {message}
                  </div>
                )}
              </div>
            )}

            {/* Overview tab */}
            {active === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-900 mb-4">
                      Quick stats
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Total templates
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {templates.length}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Total downloads
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {totalDownloads}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Unique users for revenue
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          {uniqueUserPeriods}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Each user counted once per 30 days across all your
                          templates.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                        <p className="text-xs text-zinc-500 mb-1">
                          Revenue
                        </p>
                        <p className="text-2xl font-bold text-zinc-900">
                          ₹{Math.round(revenue).toLocaleString('en-IN')}
                        </p>
                        {revenue > 0 && revenue < 800 && (
                          <p className="text-[10px] text-amber-600 mt-1">
                            Minimum payout: ₹800
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                      <p className="text-xs text-zinc-500 mb-1">
                        Public URL
                      </p>
                      <p className="text-xs font-mono text-zinc-800 break-all">
                        {shop
                          ? `celite.in/${shop.slug}`
                          : "Create your shop to get a URL"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-sm font-bold text-zinc-900 mb-2">
                      Recent templates
                    </h2>
                    {templates.length === 0 ? (
                      <p className="text-xs text-zinc-500">
                        No templates yet. Switch to &ldquo;My Templates&rdquo; to
                        add one.
                      </p>
                    ) : (
                      <ul className="divide-y divide-zinc-100 text-sm">
                        {templates.slice(0, 5).map((tpl) => {
                          const status = getStatusLabel(tpl.status);
                          const statusClass =
                            tpl.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : tpl.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100";

                          return (
                            <li
                              key={tpl.slug}
                              className="py-2 flex items-center justify-between gap-3"
                            >
                              <div>
                                <Link
                                  href={`/product/${tpl.slug}`}
                                  className="font-semibold text-zinc-900 hover:text-blue-600"
                                >
                                  {tpl.name}
                                </Link>
                                <p className="text-xs text-zinc-500">
                                  {tpl.downloadCount}{" "}
                                  {tpl.downloadCount === 1
                                    ? "download"
                                    : "downloads"}{" "}
                                  · {status}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-50 border border-zinc-100 text-zinc-500 font-mono">
                                  {tpl.slug}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}
                                >
                                  {status}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Shop details
                    </h3>
                    {shop ? (
                      <div className="space-y-1 text-xs text-zinc-600">
                        <p>
                          <span className="font-semibold">Name:</span>{" "}
                          {shop.name}
                        </p>
                        <p>
                          <span className="font-semibold">Slug:</span>{" "}
                          {shop.slug}
                        </p>
                        {shop.description && (
                          <p className="mt-1">{shop.description}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        No shop created yet.{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/start-selling")}
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          Start selling
                        </button>
                      </p>
                    )}
                  </div>

                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Bank &amp; payouts
                    </h3>
                    {shop ? (
                      <div className="space-y-3 text-xs text-zinc-600">
                        {revenue > 0 && (
                          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 mb-3">
                            <p className="text-xs text-zinc-500 mb-1">
                              Current revenue
                            </p>
                            <p className="text-lg font-bold text-zinc-900">
                              ₹{Math.round(revenue).toLocaleString('en-IN')}
                            </p>
                            {revenue < 800 && (
                              <p className="text-[10px] text-amber-600 mt-1">
                                Minimum payout: ₹800
                              </p>
                            )}
                            {revenue >= 800 && (
                              <p className="text-[10px] text-emerald-600 mt-1">
                                Eligible for payout
                              </p>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <p>
                            <span className="font-semibold">Account name:</span>{" "}
                            {shop.bank_account_name || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">Account number:</span>{" "}
                            {shop.bank_account_number || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">IFSC:</span>{" "}
                            {shop.bank_ifsc || "Not set"}
                          </p>
                          <p>
                            <span className="font-semibold">UPI ID:</span>{" "}
                            {shop.bank_upi_id || "Not set"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => router.push("/start-selling")}
                          className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
                        >
                          Edit bank details
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">
                        Bank details will appear here after you create your
                        shop.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* Templates tab */}
            {active === "templates" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-zinc-900">
                        Your templates
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setFormOpen(!formOpen);
                          if (!formOpen) resetForm();
                        }}
                        className="inline-flex items-center rounded-full bg-blue-600 text-white px-4 py-1.5 text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        {formOpen ? "Close" : "Add template"}
                      </button>
                    </div>

                    {formOpen && (
                      <form
                        onSubmit={handleCreateTemplate}
                        className="space-y-3 mb-6"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Template name
                            </label>
                            <input
                              type="text"
                              value={form.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  name: newName,
                                  slug: slugManuallyEdited
                                    ? f.slug
                                    : generateSlug(newName),
                                }));
                              }}
                              required
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Slug
                            </label>
                            <input
                              type="text"
                              value={form.slug}
                              onChange={(e) => {
                                setSlugManuallyEdited(true);
                                setForm((f) => ({ ...f, slug: e.target.value }));
                              }}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                              placeholder="auto-generated-from-name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Category
                            </label>
                            <select
                              value={form.category_id}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  category_id: e.target.value,
                                }))
                              }
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            >
                              <option value="">Select category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Subcategory
                            </label>
                            <select
                              value={form.subcategory_id}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  subcategory_id: e.target.value,
                                }))
                              }
                              disabled={!form.category_id}
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-zinc-100 disabled:text-zinc-400"
                            >
                              <option value="">Select subcategory</option>
                              {filteredSubcategories.map((sub) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              YouTube video link
                            </label>
                            <input
                              type="text"
                              value={form.video}
                              onChange={(e) =>
                                setForm((f) => ({ ...f, video: e.target.value }))
                              }
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Source download link
                            </label>
                            <input
                              type="text"
                              value={form.source_path}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  source_path: e.target.value,
                                }))
                              }
                              placeholder="Google Drive / Dropbox direct link"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-zinc-700 mb-1">
                            Short description
                          </label>
                          <textarea
                            value={form.description}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                description: e.target.value,
                              }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            placeholder="Describe what this template includes."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Features (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.features}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  features: e.target.value,
                                }))
                              }
                              placeholder="e.g. 4K, No plugin required"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Software used (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.software}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  software: e.target.value,
                                }))
                              }
                              placeholder="e.g. After Effects 2024"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Plugins used (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.plugins}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  plugins: e.target.value,
                                }))
                              }
                              placeholder="e.g. Element 3D, Optical Flares"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-700 mb-1">
                              Tags (comma separated)
                            </label>
                            <input
                              type="text"
                              value={form.tags}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  tags: e.target.value,
                                }))
                              }
                              placeholder="e.g. intro, cinematic, title"
                              className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormOpen(false);
                              resetForm();
                            }}
                            className="px-4 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
                          >
                            {saving ? "Saving..." : "Save template"}
                          </button>
                        </div>
                      </form>
                    )}

                    {templates.length === 0 ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-500">
                        No templates yet. Use &ldquo;Add template&rdquo; to
                        upload your first one.
                      </div>
                    ) : (
                      <ul className="divide-y divide-zinc-100 mt-2">
                        {templates.map((tpl) => {
                          const status = getStatusLabel(tpl.status);
                          const statusClass =
                            tpl.status === "pending"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : tpl.status === "rejected"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100";

                          return (
                            <li
                              key={tpl.slug}
                              className="py-3 flex items-center justify-between gap-3"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/product/${tpl.slug}`}
                                    className="text-sm font-semibold text-zinc-900 hover:text-blue-600"
                                  >
                                    {tpl.name}
                                  </Link>
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-mono">
                                    {tpl.slug}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                  {tpl.downloadCount}{" "}
                                  {tpl.downloadCount === 1
                                    ? "download"
                                    : "downloads"}{" "}
                                  {tpl.created_at && (
                                    <>
                                      · added{" "}
                                      {new Date(
                                        tpl.created_at
                                      ).toLocaleDateString()}
                                    </>
                                  )}{" "}
                                  · {status}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}
                                >
                                  {status}
                                </span>
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/product/${tpl.slug}`}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                                  >
                                    View
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTemplate(tpl.slug)}
                                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Tips
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Use clear names and detailed descriptions so buyers can
                      quickly understand your template.
                    </p>
                  </div>
                </section>
              </div>
            )}

            {/* Settings tab */}
            {active === "settings" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h2 className="text-lg font-bold text-zinc-900 mb-2">
                      Creator settings
                    </h2>
                    <p className="text-sm text-zinc-500 mb-4">
                      Manage your creator profile, shop and payout preferences.
                    </p>
                    <button
                      type="button"
                      onClick={() => router.push("/start-selling")}
                      className="inline-flex items-center rounded-xl bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Edit shop &amp; bank details
                    </button>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                      Coming soon
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Additional creator settings will appear here in the next
                      iterations (notifications, payout preferences, etc.).
                    </p>
                  </div>
                </section>
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="border-t border-zinc-200 py-4 px-6 text-center text-zinc-400 text-xs bg-white">
            &copy; {new Date().getFullYear()} Celite. Creator Panel.
          </footer>
        </div>
      </div>
    </main>
  );
}


