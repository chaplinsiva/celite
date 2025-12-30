"use client";

import Link from "next/link";
import { useAppContext } from "../../context/AppContext";
import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";
import { formatPrice } from "../../lib/currency";
import PurchaseDownloadButton from "./PurchaseDownloadButton";
import { GlowingEffect } from "../../components/ui/glowing-effect";
import { cn } from "../../lib/utils";
import LoadingSpinner from "../../components/ui/loading-spinner";

type DownloadItemRow = {
  slug: string;
  name: string;
  img: string | null;
  downloaded_at: string;
};

type CreatorShop = {
  slug: string;
  name: string;
  description: string | null;
};

// Component that uses search params (needs to be in Suspense)
function DashboardContent() {
  const { user, logout } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sub, setSub] = useState<{ is_active: boolean; plan: string | null; valid_until: string | null; created_at: string | null; updated_at: string | null; autopay_enabled: boolean | null } | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [recentDownloads, setRecentDownloads] = useState<DownloadItemRow[]>([]);
  const [creatorShop, setCreatorShop] = useState<CreatorShop | null>(null);
  const [viewMode, setViewMode] = useState<"buyer" | "seller">("buyer");
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showManageSubscription, setShowManageSubscription] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showRenewConfirm, setShowRenewConfirm] = useState(false);
  const [userMetadata, setUserMetadata] = useState<{ first_name: string | null; last_name: string | null }>({ first_name: null, last_name: null });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Show success message if redirected from payment
  useEffect(() => {
    if (searchParams?.get('payment') === 'success') {
      setMessage('Payment successful! Your purchase is now available.');
      setTimeout(() => setMessage(null), 5000);
      // Remove query param from URL
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  // Function to reload all dashboard data
  const reloadDashboardData = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();

    // Load user metadata
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser?.user_metadata) {
      setUserMetadata({
        first_name: currentUser.user_metadata.first_name || null,
        last_name: currentUser.user_metadata.last_name || null,
      });
    }

    // Load subscription - use realtime subscription for auto-updates
    const { data: s } = await supabase
      .from('subscriptions')
      .select('is_active, plan, valid_until, created_at, updated_at, autopay_enabled')
      .eq('user_id', (user as any).id)
      .maybeSingle();
    if (s) {
      setSub({
        is_active: !!s.is_active,
        plan: s.plan ?? null,
        valid_until: s.valid_until ?? null,
        created_at: s.created_at ?? null,
        updated_at: s.updated_at ?? null,
        autopay_enabled: typeof s.autopay_enabled === 'boolean' ? s.autopay_enabled : null,
      });
    } else {
      setSub(null);
    }

    // Load pricing from settings
    const { data: settings } = await supabase.from('settings').select('key,value');
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((row: any) => {
        map[row.key] = row.value;
      });
      const parsePrice = (value?: string, threshold = 10000) => {
        if (!value) return null;
        let amount = Number(value);
        if (Number.isNaN(amount) || amount <= 0) return null;
        if (amount >= threshold) amount = amount / 100;
        return Math.round(amount);
      };
      setMonthlyPrice(parsePrice(map.RAZORPAY_MONTHLY_AMOUNT, 10000));
      setYearlyPrice(parsePrice(map.RAZORPAY_YEARLY_AMOUNT, 100000));
    }

    // Load creator shop (if any)
    try {
      const { data: shop } = await supabase
        .from("creator_shops")
        .select("slug, name, description")
        .eq("user_id", (user as any).id)
        .maybeSingle();
      setCreatorShop(shop ?? null);
    } catch (e) {
      console.error("Failed to load creator shop", e);
      setCreatorShop(null);
    }

    // Load recent downloads (subscription-based) for this user
    try {
      const { data: dl } = await supabase
        .from('downloads')
        .select('template_slug, downloaded_at')
        .eq('user_id', (user as any).id)
        .order('downloaded_at', { ascending: false })
        .limit(10);

      if (dl && dl.length > 0) {
        const slugs = Array.from(new Set(dl.map((d: any) => d.template_slug)));
        const { data: tpls } = await supabase
          .from('templates')
          .select('slug,name,img')
          .in('slug', slugs);
        const tplMap: Record<string, { name: string; img: string | null }> = {};
        (tpls ?? []).forEach((t: any) => {
          tplMap[t.slug] = { name: t.name, img: t.img ?? null };
        });

        const enriched: DownloadItemRow[] = dl.map((d: any) => ({
          slug: d.template_slug,
          name: tplMap[d.template_slug]?.name || d.template_slug,
          img: tplMap[d.template_slug]?.img ?? null,
          downloaded_at: d.downloaded_at,
        }));
        setRecentDownloads(enriched);
      } else {
        setRecentDownloads([]);
      }
    } catch (e) {
      console.error('Failed to load recent downloads', e);
      setRecentDownloads([]);
    }
  }, [user]);

  useEffect(() => {
    reloadDashboardData();

    // Set up periodic refresh every 30 seconds to catch subscription renewals
    const refreshInterval = setInterval(() => {
      reloadDashboardData();
    }, 30000); // 30 seconds

    // Also refresh when window regains focus (user comes back to tab)
    const handleFocus = () => {
      reloadDashboardData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [reloadDashboardData]);


  const handleEditProfile = async (firstName: string, lastName: string) => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Update failed');

      // Reload all dashboard data including user metadata
      await reloadDashboardData();

      setMessage('Profile updated successfully!');
      setShowEditProfile(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to update profile');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (newPassword: string, confirmPassword: string) => {
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Password change failed');

      setMessage('Password changed successfully!');
      setShowChangePassword(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to change password');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelSubscription = async () => {
    setShowCancelConfirm(false);
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please log in again.');
        return;
      }

      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Cancel failed');

      // Reload all dashboard data
      await reloadDashboardData();

      setMessage('Subscription cancelled successfully');
      setShowManageSubscription(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Failed to cancel subscription');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewSubscription = async () => {
    setShowRenewConfirm(true);
  };

  const confirmRenewSubscription = async () => {
    setShowRenewConfirm(false);
    // Redirect to checkout with the subscription plan
    if (sub?.plan) {
      router.push(`/checkout?subscription=${sub.plan}`);
    } else {
      // If no plan found, redirect to pricing page
      router.push('/pricing');
    }
  };

  // Check if subscription is actually active (is_active AND valid_until in future)
  const now = Date.now();
  const validUntil = sub?.valid_until ? new Date(sub.valid_until).getTime() : null;
  const isActuallyActive = !!sub?.is_active && (!validUntil || validUntil > now);
  const isPaused: boolean = !!(sub?.is_active && validUntil && validUntil <= now); // is_active true but validity expired
  const hasExpiredPlan = !sub?.is_active && sub?.plan; // Subscription expired and inactive
  const subscriptionTier = isActuallyActive
    ? (sub?.plan || 'Pro')
    : isPaused
      ? `${sub?.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan - Paused`
      : hasExpiredPlan
        ? `${sub?.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan Expired`
        : 'Free';
  const displayMonthlyPrice = formatPrice(monthlyPrice ?? 799);
  const displayYearlyPrice = formatPrice(yearlyPrice ?? 5499);

  if (!user) {
    return (
      <main className="bg-background min-h-screen pt-20 pb-20 px-6 relative">
        <div className="relative max-w-3xl mx-auto text-center mt-20">
          <div className="bg-white rounded-3xl border border-zinc-200 p-12 shadow-xl shadow-blue-900/5">
            <h1 className="text-3xl font-bold text-zinc-900">Please sign in to view your dashboard</h1>
            <p className="mt-4 text-zinc-500 text-lg">Access your downloads, subscription, and account settings.</p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center rounded-2xl bg-blue-600 px-8 py-3 text-base font-semibold text-white transition hover:bg-blue-700 shadow-lg shadow-blue-600/20"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Get display name - prefer first/last name, fallback to email username
  const displayName = userMetadata.first_name || userMetadata.last_name
    ? `${userMetadata.first_name || ''} ${userMetadata.last_name || ''}`.trim()
    : user.email.split("@")[0];

  return (
    <main className="bg-background min-h-screen pt-20 pb-20 px-6 relative">
      <div className="relative max-w-6xl mx-auto space-y-6">
        {/* Welcome Section */}
        <section className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="uppercase tracking-wider text-xs font-bold text-blue-600">Dashboard</p>
              <h1 className="mt-2 text-3xl font-bold text-zinc-900">Welcome back, {displayName}</h1>
            </div>
            <div className="bg-zinc-50 rounded-2xl border border-zinc-100 px-6 py-4 text-right">
              <p className="text-sm text-zinc-500 font-medium">Current Plan</p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{subscriptionTier}</p>

              {isActuallyActive && sub?.valid_until && (
                <p className="mt-1 text-xs text-green-600 font-medium flex items-center justify-end gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active{sub?.plan ? ` • ${sub.plan === 'yearly' ? 'Yearly' : 'Monthly'}` : ''}
                </p>
              )}
            </div>
          </div>

          {/* Buyer / Seller mode toggle (only if user has a creator shop) */}
          {creatorShop && (
            <div className="mt-6 inline-flex rounded-full bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("buyer")}
                className={`px-4 py-1.5 rounded-full font-medium transition-colors ${viewMode === "buyer"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                  }`}
              >
                Buyer mode
              </button>
              <button
                type="button"
                onClick={() => setViewMode("seller")}
                className={`px-4 py-1.5 rounded-full font-medium transition-colors ${viewMode === "seller"
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
                  }`}
              >
                Seller mode
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {!isActuallyActive && !isPaused && !hasExpiredPlan && (
              <>
                <Link href="/pricing" className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/10">
                  Subscribe Monthly ({displayMonthlyPrice})
                </Link>
                <Link href="/pricing" className="inline-flex items-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 hover:border-zinc-300">
                  Subscribe Yearly ({displayYearlyPrice})
                </Link>
              </>
            )}
            {hasExpiredPlan && (
              <button
                onClick={handleRenewSubscription}
                disabled={loading}
                className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-md shadow-blue-600/10 disabled:opacity-60"
              >
                {loading ? 'Renewing...' : 'Renew Plan'}
              </button>
            )}
          </div>
        </section>

        {viewMode === "buyer" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Downloads (Main Column) */}
            <section className="lg:col-span-2 bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm h-fit">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900">Recent Downloads</h2>
                <Link href="/video-templates" className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">Browse templates</Link>
              </div>

              {recentDownloads.length === 0 ? (
                <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-zinc-100 border-dashed">
                  <p className="text-zinc-500 mb-4">You haven't downloaded any templates yet.</p>
                  <Link href="/video-templates" className="text-sm font-semibold text-blue-600 hover:underline">
                    Explore Collection
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {recentDownloads.map((d) => (
                    <li key={`${d.slug}-${d.downloaded_at}`} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-100">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-20 overflow-hidden rounded-xl bg-zinc-100 border border-zinc-200 shadow-sm relative">
                          {d.img ? (
                            <img src={d.img} alt={d.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <span className="text-xs">No img</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/product/${d.slug}`}
                            className="text-base font-semibold text-zinc-900 hover:text-blue-600 transition-colors"
                          >
                            {d.name}
                          </Link>
                          <p className="text-xs text-zinc-500 mt-1">
                            Downloaded on {new Date(d.downloaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link
                        href={`/product/${d.slug}`}
                        className="px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 shadow-sm hover:border-zinc-300 transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0"
                      >
                        View
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Sidebar: Account & Subscription Info */}
            <div className="space-y-6">
              {/* Account Settings */}
              <section className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
                <h2 className="text-xl font-bold text-zinc-900 mb-2">Account Settings</h2>
                <p className="text-sm text-zinc-500 mb-6">Manage your profile and security.</p>

                <div className="flex flex-col gap-3">
                  <button onClick={() => setShowEditProfile(true)} className="w-full text-left px-4 py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-sm font-medium text-zinc-700 transition-colors flex justify-between group">
                    Edit Profile
                    <span className="text-zinc-400 group-hover:text-zinc-600">→</span>
                  </button>
                  <button onClick={() => setShowChangePassword(true)} className="w-full text-left px-4 py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-sm font-medium text-zinc-700 transition-colors flex justify-between group">
                    Change Password
                    <span className="text-zinc-400 group-hover:text-zinc-600">→</span>
                  </button>
                  <button onClick={() => setShowManageSubscription(true)} className="w-full text-left px-4 py-3 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-100 text-sm font-medium text-zinc-700 transition-colors flex justify-between group">
                    Manage Subscription
                    <span className="text-zinc-400 group-hover:text-zinc-600">→</span>
                  </button>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 text-sm font-medium transition-colors mt-2"
                  >
                    Log Out
                  </button>
                </div>
              </section>

              {/* Quick Sub Details */}
              <section className="bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
                <h2 className="text-lg font-bold text-zinc-900 mb-4">Subscription Details</h2>
                {!sub ? (
                  <p className="text-sm text-zinc-500">No active subscription.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-zinc-100">
                      <span className="text-zinc-500">Status</span>
                      <span className={`font-semibold ${isActuallyActive ? 'text-green-600' : 'text-zinc-900'}`}>{subscriptionTier}</span>
                    </div>
                    {sub.valid_until && (
                      <div className="flex justify-between py-2 border-b border-zinc-100">
                        <span className="text-zinc-500">Renews</span>
                        <span className="text-zinc-900 font-medium">{new Date(sub.valid_until).toLocaleDateString()}</span>
                      </div>
                    )}
                    {sub.autopay_enabled !== null && (
                      <div className="flex justify-between py-2 border-b border-zinc-100">
                        <span className="text-zinc-500">Autopay</span>
                        <span className="text-zinc-900 font-medium">{sub.autopay_enabled ? 'On' : 'Off'}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {viewMode === "seller" && creatorShop && (
          <section className="mt-6 bg-white rounded-3xl border border-zinc-200 p-8 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Seller mode</h2>
            <p className="text-sm text-zinc-500 mb-4">
              This is your creator hub view. Your public page is live at:
            </p>
            <a
              href={`/${creatorShop.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              celite.in/{creatorShop.slug}
            </a>
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center text-sm text-zinc-400">
              Blank seller page for now. We&apos;ll add uploads and stats here later.
            </div>
          </section>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Edit Profile</h2>
            <EditProfileForm
              firstName={userMetadata.first_name || ''}
              lastName={userMetadata.last_name || ''}
              onSubmit={handleEditProfile}
              onCancel={() => setShowEditProfile(false)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => setShowChangePassword(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Change Password</h2>
            <ChangePasswordForm
              onSubmit={handleChangePassword}
              onCancel={() => setShowChangePassword(false)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {showManageSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => setShowManageSubscription(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Manage Subscription</h2>
            <ManageSubscriptionPanel
              isActive={isActuallyActive}
              isPaused={isPaused}
              plan={sub?.plan ?? null}
              validUntil={sub?.valid_until ?? null}
              onCancel={handleCancelSubscription}
              onRenew={handleRenewSubscription}
              onUpgrade={() => { setShowManageSubscription(false); window.location.href = '/pricing'; }}
              onClose={() => setShowManageSubscription(false)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Cancel Subscription</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Are you sure you want to cancel your subscription? You will lose access to premium features.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmCancelSubscription}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition disabled:opacity-60 shadow-md shadow-red-600/10"
              >
                {loading ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition"
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Confirmation Modal */}
      {showRenewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm" onClick={() => setShowRenewConfirm(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-zinc-100" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-zinc-900">Renew Subscription</h2>
            <p className="text-sm text-zinc-500 mb-6">
              You will be redirected to checkout to complete payment and renew your subscription. Continue?
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmRenewSubscription}
                className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-600/10"
              >
                Continue to Checkout
              </button>
              <button
                onClick={() => setShowRenewConfirm(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-zinc-900 rounded-xl px-6 py-4 shadow-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <p className="text-sm font-medium text-white">{message}</p>
          </div>
        </div>
      )}
    </main>
  );
}

function EditProfileForm({ firstName, lastName, onSubmit, onCancel, loading }: { firstName: string; lastName: string; onSubmit: (firstName: string, lastName: string) => void; onCancel: () => void; loading: boolean }) {
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);

  useEffect(() => {
    setFirst(firstName);
    setLast(lastName);
  }, [firstName, lastName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(first.trim(), last.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">First Name</label>
        <input
          type="text"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">Last Name</label>
        <input
          type="text"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          required
        />
      </div>
      <div className="flex gap-3 mt-8">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 shadow-md shadow-blue-600/10"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ChangePasswordForm({ onSubmit, onCancel, loading }: { onSubmit: (newPassword: string, confirmPassword: string) => void; onCancel: () => void; loading: boolean }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(newPassword, confirmPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-zinc-700 mb-2">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          minLength={6}
          required
        />
      </div>
      <div className="flex gap-3 mt-8">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 shadow-md shadow-blue-600/10"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ManageSubscriptionPanel({ isActive, isPaused, plan, validUntil, onCancel, onRenew, onUpgrade, onClose, loading }: {
  isActive: boolean;
  isPaused: boolean;
  plan: string | null;
  validUntil: string | null;
  onCancel: () => void;
  onRenew: () => void;
  onUpgrade: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const hasExpiredPlan = !isActive && !isPaused && plan; // Subscription expired and inactive
  const planDisplayName = plan === 'yearly' ? 'Yearly' : 'Monthly';

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100">
        <p className="text-sm text-zinc-500 mb-2 font-medium">Current Status</p>
        <p className="text-xl font-bold text-zinc-900">
          {isActive
            ? `${planDisplayName} Plan - Active`
            : isPaused
              ? `${planDisplayName} Plan - Paused`
              : hasExpiredPlan
                ? `${planDisplayName} Plan Expired`
                : 'No Active Subscription'}
        </p>
        {validUntil && (
          <p className={`text-xs mt-2 font-medium ${isActive ? 'text-green-600' : isPaused ? 'text-yellow-600' : 'text-red-500'}`}>
            {isActive
              ? `Valid until: ${new Date(validUntil).toLocaleDateString()}`
              : isPaused
                ? `Expired: ${new Date(validUntil).toLocaleDateString()} - Waiting for payment`
                : `Expired on: ${new Date(validUntil).toLocaleDateString()}`}
          </p>
        )}
      </div>

      {isActive ? (
        <div className="space-y-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl border border-red-200 text-red-600 font-semibold hover:bg-red-50 transition disabled:opacity-60"
          >
            {loading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Cancelling will end your subscription after the current billing period.
          </p>
        </div>
      ) : isPaused ? (
        <div className="space-y-4">
          <p className="text-sm text-yellow-600 font-medium bg-yellow-50 p-4 rounded-xl border border-yellow-100">
            Subscription paused. Payment will automatically retry.
          </p>
          <button
            onClick={onRenew}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 shadow-md shadow-blue-600/10"
          >
            {loading ? 'Renewing...' : 'Renew Now'}
          </button>
        </div>
      ) : hasExpiredPlan ? (
        <div className="space-y-4">
          <button
            onClick={onRenew}
            disabled={loading}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-60 shadow-md shadow-blue-600/10"
          >
            {loading ? 'Renewing...' : 'Renew Plan'}
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Renew to regain premium access.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <button
            onClick={onUpgrade}
            className="w-full px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-md shadow-blue-600/10"
          >
            Upgrade to Pro
          </button>
          <p className="text-xs text-zinc-500 text-center">
            Unlocks unlimited templates.
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50 transition"
      >
        Close
      </button>
    </div>
  );
}

// Main component with Suspense boundary
export default function DashboardClient() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading dashboard..." fullScreen />}>
      <DashboardContent />
    </Suspense>
  );
}

