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

type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
};

type OrderItemRow = {
  order_id: string;
  name: string;
  quantity: number;
  price: number;
};

// Component that uses search params (needs to be in Suspense)
function DashboardContent() {
  const { user, logout } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orders, setOrders] = useState<Array<{ id: string; date: string; status: string; amount: string; item: string }>>([]);
  const [sub, setSub] = useState<{ is_active: boolean; plan: string | null; valid_until: string | null } | null>(null);
  const [monthlyPrice, setMonthlyPrice] = useState<number | null>(null);
  const [yearlyPrice, setYearlyPrice] = useState<number | null>(null);
  const [purchases, setPurchases] = useState<Array<{ slug: string; name: string; price: number; img: string }>>([]);
  const [recentDownloads, setRecentDownloads] = useState<Array<{ id: string; slug: string | null; name: string | null; img: string | null; downloaded_at: string }>>([]);
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
      .select('is_active, plan, valid_until')
      .eq('user_id', (user as any).id)
      .maybeSingle();
    if (s) setSub({ is_active: !!s.is_active, plan: s.plan ?? null, valid_until: s.valid_until ?? null });

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
    
    // Load orders
    const { data: ords } = await supabase
      .from('orders')
      .select('id, created_at, total, status')
      .eq('user_id', (user as any).id)
      .order('created_at', { ascending: false }) as unknown as { data: OrderRow[] };
    const orderIds = (ords ?? []).map(o => o.id);
    if (orderIds.length === 0) { 
      setOrders([]); 
      setPurchases([]);
      return; 
    }
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id,name,quantity,price,slug,img')
      .in('order_id', orderIds) as unknown as { data: OrderItemRow[] };
    const firstItemByOrder: Record<string, OrderItemRow | undefined> = {};
    (items ?? []).forEach((it) => { if (!firstItemByOrder[it.order_id]) firstItemByOrder[it.order_id] = it; });
    const merged = (ords ?? []).map((o) => {
      const f = firstItemByOrder[o.id];
      const amount = formatPrice(Number(o.total));
      const itemLabel = f ? f.name : 'Order';
      return {
        id: `#${o.id.slice(0, 8)}`,
        date: new Date(o.created_at).toLocaleDateString(),
        status: o.status || 'Paid',
        amount,
        item: itemLabel,
      };
    });
    setOrders(merged);

    // Flatten purchases list
    const flattened: Array<{ slug: string; name: string; price: number; img: string }> = ((items as any) ?? []).map((it: any) => ({ slug: it.slug, name: it.name, price: Number(it.price), img: it.img }))
      // de-duplicate by slug (keep latest)
      .filter((v: { slug: string; name: string; price: number; img: string }, i: number, a: Array<{ slug: string; name: string; price: number; img: string }>) => a.findIndex((t: { slug: string }) => t.slug === v.slug) === i);
    setPurchases(flattened);

    // Load recent subscription downloads (limit 5)
    const { data: downloadRows } = await supabase
      .from('downloads')
      .select('id, template_slug, downloaded_at')
      .eq('user_id', (user as any).id)
      .order('downloaded_at', { ascending: false })
      .limit(5);
    if (downloadRows && downloadRows.length > 0) {
      const templateSlugsForDownloads = Array.from(new Set(downloadRows.map((dl: any) => dl.template_slug).filter(Boolean)));
      let downloadTemplateMap: Record<string, any> = {};
      if (templateSlugsForDownloads.length > 0) {
        const { data: downloadTemplates } = await supabase
          .from('templates')
          .select('slug, name, img')
          .in('slug', templateSlugsForDownloads);
        (downloadTemplates ?? []).forEach((tpl: any) => {
          downloadTemplateMap[tpl.slug] = tpl;
        });
      }
      setRecentDownloads(downloadRows.map((dl: any) => ({
        id: dl.id,
        downloaded_at: dl.downloaded_at,
        name: downloadTemplateMap[dl.template_slug]?.name || 'Template removed',
        slug: downloadTemplateMap[dl.template_slug]?.slug || dl.template_slug || null,
        img: downloadTemplateMap[dl.template_slug]?.img || null,
      })));
    } else {
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
    ? `${sub?.plan === 'weekly' ? 'Weekly' : sub?.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan - Paused`
    : hasExpiredPlan 
    ? `${sub?.plan === 'weekly' ? 'Weekly' : sub?.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan Expired`
    : 'Free';
  const displayMonthlyPrice = formatPrice(monthlyPrice ?? 799);
  const displayYearlyPrice = formatPrice(yearlyPrice ?? 5499);

  if (!user) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white relative">
        {/* Colorful Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-12 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h1 className="text-3xl font-semibold text-white">Please sign in to view your dashboard</h1>
              <Link
                href="/login"
                className="mt-8 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Go to Login
              </Link>
            </div>
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
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white relative">
      {/* Colorful Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      <div className="relative max-w-6xl mx-auto space-y-4">
        <section className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative flex flex-col gap-6 overflow-hidden rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="uppercase tracking-[0.35em] text-xs text-zinc-400">Dashboard</p>
              <h1 className="mt-3 text-3xl font-bold text-white">Welcome back, {displayName}</h1>
              <p className="mt-2 text-zinc-300">Manage your Celite purchases, billing, and profile preferences.</p>
            </div>
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/60 backdrop-blur-sm px-6 py-4 text-right">
            <p className="text-sm text-white/70">Subscription</p>
            <p className="mt-1 text-2xl font-semibold text-white">{subscriptionTier}</p>
            {/* Show subscription details */}
            {isActuallyActive && sub?.valid_until && (
              <p className={`mt-1 text-xs text-green-300`}>
                Active{sub?.plan ? ` • ${sub.plan === 'yearly' ? 'Yearly' : sub.plan === 'weekly' ? 'Weekly' : 'Monthly'}` : ''}
                <br />
                <span className="text-zinc-400">Valid until: {new Date(sub.valid_until).toLocaleDateString()} {new Date(sub.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            )}
            {isPaused && sub?.valid_until && (
              <div className="mt-2">
                <p className="text-xs text-yellow-400 font-semibold">
                  Paused - Waiting for next payment
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Expired: {new Date(sub.valid_until).toLocaleDateString()} {new Date(sub.valid_until).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Subscription will resume when payment is processed
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-end">
                  <button
                    onClick={handleRenewSubscription}
                    disabled={loading}
                    className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-pink-600 hover:to-purple-600 disabled:opacity-60"
                  >
                    {loading ? 'Renewing...' : 'Renew Now'}
                  </button>
                </div>
              </div>
            )}
            {hasExpiredPlan && (
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={handleRenewSubscription}
                  disabled={loading}
                  className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:from-pink-600 hover:to-purple-600 disabled:opacity-60"
                >
                  {loading ? 'Renewing...' : 'Renew Plan'}
                </button>
              </div>
            )}
            {!isActuallyActive && !isPaused && !hasExpiredPlan && (
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                <Link href="/pricing" className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200">
                  Monthly ({displayMonthlyPrice})
                </Link>
                <Link href="/pricing" className="inline-flex items-center rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">
                  Yearly ({displayYearlyPrice})
                </Link>
              </div>
            )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-7 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Order History</h2>
                <Link href="/" className="text-sm text-blue-300 hover:underline">Browse Templates</Link>
              </div>
              <ul className="mt-6 space-y-4 text-sm text-zinc-200">
                {orders.map((order) => (
                  <li key={order.id} className="relative rounded-xl border-[0.75px] border-white/10 bg-black/60 backdrop-blur-sm px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{order.item}</p>
                      <p className="text-xs text-zinc-400">{order.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{order.amount}</p>
                      <p className="text-xs text-green-300">{order.status}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">Order ID {order.id}</p>
                </li>
              ))}
              </ul>
            </div>
          </div>

          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-7 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold text-white">Account Settings</h2>
              <p className="mt-2 text-sm text-zinc-300">Control your profile and account preferences.</p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs">
                <button onClick={() => setShowEditProfile(true)} className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:border-white hover:bg-white/10">Edit profile</button>
                <button onClick={() => setShowChangePassword(true)} className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:border-white hover:bg-white/10">Change password</button>
                <button onClick={() => setShowManageSubscription(true)} className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:border-white hover:bg-white/10">Manage subscription</button>
              </div>
              <p className="mt-5 text-xs text-zinc-400">
                Payment methods are managed securely through Razorpay during checkout. Your subscription and orders are processed through our secure payment gateway.
              </p>
            </div>
          </div>
        </section>

        <section className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-7 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Recent Downloads</h2>
              <p className="text-xs text-zinc-400">Latest 5 subscription downloads</p>
            </div>
            {recentDownloads.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400">You haven't downloaded any templates with your subscription yet.</p>
            ) : (
              <ul className="mt-6 space-y-3">
                {recentDownloads.map((dl) => (
                  <li key={dl.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-white/10 bg-black/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{dl.name}</p>
                      <p className="text-xs text-zinc-400">{new Date(dl.downloaded_at).toLocaleString()}</p>
                    </div>
                    {dl.slug && (
                      <Link href={`/product/${dl.slug}`} className="mt-2 sm:mt-0 inline-flex items-center rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition">
                        View Template
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-7 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Purchases</h2>
              <Link href="/" className="text-sm text-blue-300 hover:underline">Get more templates</Link>
            </div>
            {purchases.length === 0 ? (
              <p className="mt-6 text-sm text-zinc-400">You haven't purchased any individual templates yet.</p>
            ) : (
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {purchases.map((p) => (
                  <li key={p.slug} className="relative rounded-xl border-[0.75px] border-white/10 bg-black/60 backdrop-blur-sm p-3 flex flex-col">
                  <div className="h-28 w-full overflow-hidden rounded-xl mb-3">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-zinc-400">{formatPrice(p.price)}</p>
                  </div>
                  <PurchaseDownloadButton slug={p.slug} />
                </li>
              ))}
              </ul>
            )}
          </div>
        </section>

        <section className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-7 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <h2 className="text-xl font-semibold text-white">Subscription</h2>
            <p className="mt-3 text-sm text-zinc-300">
              You are currently on the {subscriptionTier} plan. Upgrade for unlimited pro templates and priority support.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <Link href="/pricing" className="rounded-full bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-200">
                Manage subscription
              </Link>
              <button
                onClick={logout}
                className="rounded-full border border-white/20 px-4 py-2 text-white transition hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}>
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold mb-4 text-white">Edit Profile</h2>
              <EditProfileForm
                firstName={userMetadata.first_name || ''}
                lastName={userMetadata.last_name || ''}
                onSubmit={handleEditProfile}
                onCancel={() => setShowEditProfile(false)}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowChangePassword(false)}>
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold mb-4 text-white">Change Password</h2>
              <ChangePasswordForm
                onSubmit={handleChangePassword}
                onCancel={() => setShowChangePassword(false)}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manage Subscription Modal */}
      {showManageSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowManageSubscription(false)}>
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold mb-4 text-white">Manage Subscription</h2>
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
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold mb-4 text-white">Cancel Subscription</h2>
              <p className="text-sm text-zinc-300 mb-6">
                Are you sure you want to cancel your subscription? You will lose access to premium features.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmCancelSubscription}
                  disabled={loading}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-60"
                >
                  {loading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
                >
                  No, Keep It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Confirmation Modal */}
      {showRenewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowRenewConfirm(false)}>
          <div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm p-6 sm:p-8 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <h2 className="text-xl font-semibold mb-4 text-white">Renew Subscription</h2>
              <p className="text-sm text-zinc-300 mb-6">
                You will be redirected to checkout to complete payment and renew your subscription. Continue?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmRenewSubscription}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition"
                >
                  Continue to Checkout
                </button>
                <button
                  onClick={() => setShowRenewConfirm(false)}
                  className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
          <GlowingEffect
            spread={40}
            glow={true}
            disabled={false}
            proximity={64}
            inactiveZone={0.01}
            borderWidth={3}
          />
          <div className="relative rounded-xl border-[0.75px] border-white/10 bg-black/40 backdrop-blur-sm px-4 py-3 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
            <p className="text-sm text-white">{message}</p>
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
        <label className="block text-sm text-zinc-400 mb-1">First Name</label>
        <input
          type="text"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
          required
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Last Name</label>
        <input
          type="text"
          value={last}
          onChange={(e) => setLast(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
          required
        />
      </div>
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
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
        <label className="block text-sm text-zinc-400 mb-1">New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
          minLength={6}
          required
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-400 mb-1">Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm"
          minLength={6}
          required
        />
      </div>
      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
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
  const planDisplayName = plan === 'yearly' ? 'Yearly' : plan === 'weekly' ? 'Weekly' : 'Monthly';
  
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-black/40 border border-white/10">
        <p className="text-sm text-zinc-300 mb-2">Current Status</p>
        <p className="text-lg font-semibold text-white">
          {isActive 
            ? `${planDisplayName} Plan - Active` 
            : isPaused
            ? `${planDisplayName} Plan - Paused`
            : hasExpiredPlan 
            ? `${planDisplayName} Plan Expired` 
            : 'No Active Subscription'}
        </p>
        {validUntil && (
          <p className={`text-xs mt-1 ${isActive ? 'text-zinc-400' : isPaused ? 'text-yellow-400' : 'text-red-400'}`}>
            {isActive 
              ? `Valid until: ${new Date(validUntil).toLocaleDateString()} ${new Date(validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : isPaused
              ? `Expired: ${new Date(validUntil).toLocaleDateString()} ${new Date(validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - Waiting for payment`
              : `Expired on: ${new Date(validUntil).toLocaleDateString()} ${new Date(validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        )}
      </div>

      {isActive ? (
        <div className="space-y-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg border border-red-500/50 text-red-300 hover:bg-red-500/10 transition disabled:opacity-60"
          >
            {loading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
          <p className="text-xs text-zinc-400">
            Cancelling will end your subscription after the current billing period. You'll lose access to premium features.
          </p>
        </div>
      ) : isPaused ? (
        <div className="space-y-3">
          <p className="text-sm text-yellow-400 font-semibold">
            Subscription Paused
          </p>
          <p className="text-xs text-zinc-400">
            Your subscription validity has ended, but your recurring payment is set up. The subscription will automatically resume when the next payment is processed.
          </p>
          <button
            onClick={onRenew}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-60"
          >
            {loading ? 'Renewing...' : 'Renew Now'}
          </button>
        </div>
      ) : hasExpiredPlan ? (
        <div className="space-y-3">
          <button
            onClick={onRenew}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold hover:from-pink-600 hover:to-purple-600 transition disabled:opacity-60"
          >
            {loading ? 'Renewing...' : 'Renew Plan'}
          </button>
          <p className="text-xs text-zinc-400">
            Renew your subscription to regain access to all premium templates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={onUpgrade}
            className="w-full px-4 py-2 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition"
          >
            Upgrade to Pro
          </button>
          <p className="text-xs text-zinc-400">
            Subscribe to get unlimited access to all premium templates.
          </p>
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full px-4 py-2 rounded-lg border border-white/20 text-white hover:bg-white/10 transition"
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

