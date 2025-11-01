"use client";

import Link from "next/link";
import { useAppContext } from "../../context/AppContext";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabaseClient";
import { formatPrice } from "../../lib/currency";
import PurchaseDownloadButton from "./PurchaseDownloadButton";

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

export default function DashboardClient() {
  const { user, logout } = useAppContext();
  const [orders, setOrders] = useState<Array<{ id: string; date: string; status: string; amount: string; item: string }>>([]);
  const [sub, setSub] = useState<{ is_active: boolean; plan: string | null; valid_until: string | null } | null>(null);
  const [purchases, setPurchases] = useState<Array<{ slug: string; name: string; price: number; img: string }>>([]);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showManageSubscription, setShowManageSubscription] = useState(false);
  const [userMetadata, setUserMetadata] = useState<{ first_name: string | null; last_name: string | null }>({ first_name: null, last_name: null });
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const load = async () => {
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
      
      // Load subscription
      const { data: s } = await supabase
        .from('subscriptions')
        .select('is_active, plan, valid_until')
        .eq('user_id', (user as any).id)
        .maybeSingle();
      if (s) setSub({ is_active: !!s.is_active, plan: s.plan ?? null, valid_until: s.valid_until ?? null });
      const { data: ords } = await supabase
        .from('orders')
        .select('id, created_at, total, status')
        .eq('user_id', (user as any).id)
        .order('created_at', { ascending: false }) as unknown as { data: OrderRow[] };
      const orderIds = (ords ?? []).map(o => o.id);
      if (orderIds.length === 0) { setOrders([]); return; }
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id,name,quantity,price,slug,img')
        .in('order_id', orderIds) as unknown as { data: OrderItemRow[] };
      const firstItemByOrder: Record<string, OrderItemRow | undefined> = {};
      (items ?? []).forEach((it) => { if (!firstItemByOrder[it.order_id]) firstItemByOrder[it.order_id] = it; });
      const merged = (ords ?? []).map((o) => {
        const f = firstItemByOrder[o.id];
        const amount = formatPrice(Number(o.total));
        const itemLabel = f ? `${f.name}${f.quantity > 1 ? ` × ${f.quantity}` : ''}` : 'Order';
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
    };
    load();
  }, [user]);

  const activate = async (plan: 'monthly' | 'yearly') => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/subscription/activate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    // reload sub
    const { data: s } = await supabase
      .from('subscriptions')
      .select('is_active, plan, valid_until')
      .eq('user_id', (user as any).id)
      .maybeSingle();
    if (s) setSub({ is_active: !!s.is_active, plan: s.plan ?? null, valid_until: s.valid_until ?? null });
  };

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

      // Refresh user metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      if (updatedUser?.user_metadata) {
        setUserMetadata({
          first_name: updatedUser.user_metadata.first_name || null,
          last_name: updatedUser.user_metadata.last_name || null,
        });
      }

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
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
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

      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Cancel failed');

      // Reload subscription
      const { data: s } = await supabase
        .from('subscriptions')
        .select('is_active, plan, valid_until')
        .eq('user_id', (user as any).id)
        .maybeSingle();
      if (s) setSub({ is_active: !!s.is_active, plan: s.plan ?? null, valid_until: s.valid_until ?? null });

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

  const isActive = !!sub?.is_active;
  const subscriptionTier = isActive ? (sub?.plan || 'Pro') : 'Free';

  if (!user) {
    return (
      <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
        <div className="max-w-3xl mx-auto text-center rounded-3xl border border-white/10 bg-white/5 p-12">
          <h1 className="text-3xl font-semibold">Please sign in to view your dashboard</h1>
          <p className="mt-4 text-zinc-300">
            Use the demo credentials <span className="font-mono">celite@gmail.com</span> / <span className="font-mono">123</span> to explore account
            features.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-black min-h-screen pt-24 pb-20 px-6 text-white">
      <div className="max-w-6xl mx-auto space-y-12">
        <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-8 shadow-xl md:flex-row md:items-center md:justify-between">
          <div>
            <p className="uppercase tracking-[0.35em] text-xs text-white/70">Dashboard</p>
            <h1 className="mt-3 text-3xl font-bold">Welcome back, {user.email.split("@")[0]}</h1>
            <p className="mt-2 text-zinc-300">Manage your Celite purchases, billing, and profile preferences.</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/40 px-6 py-4 text-right">
            <p className="text-sm text-white/70">Subscription</p>
            <p className="mt-1 text-2xl font-semibold text-white">{subscriptionTier}</p>
            <p className={`mt-1 text-xs ${isActive ? 'text-green-300' : 'text-zinc-400'}`}>
              {isActive ? 'Active' : 'Inactive'}
              {sub?.plan ? ` • ${sub.plan === 'yearly' ? 'Yearly' : 'Monthly'}` : ''}
              {sub?.valid_until ? ` • renews ${new Date(sub.valid_until).toLocaleDateString()}` : ''}
            </p>
            {!isActive && (
              <div className="mt-3 flex gap-2 justify-end">
                <button onClick={() => activate('monthly')} className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-zinc-200">
                  Activate Monthly (₹799)
                </button>
                <button onClick={() => activate('yearly')} className="inline-flex items-center rounded-full border border-white/30 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10">
                  Activate Yearly (₹5,499)
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Order History</h2>
              <Link href="/" className="text-sm text-blue-300 hover:underline">Browse Templates</Link>
            </div>
            <ul className="mt-6 space-y-5 text-sm text-zinc-200">
              {orders.map((order) => (
                <li key={order.id} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
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

          <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg">
            <h2 className="text-xl font-semibold">Account Settings</h2>
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
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Your Purchases</h2>
            <Link href="/" className="text-sm text-blue-300 hover:underline">Get more templates</Link>
          </div>
          {purchases.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">You haven\'t purchased any individual templates yet.</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {purchases.map((p) => (
                <li key={p.slug} className="rounded-2xl border border-white/10 bg-black/40 p-3 flex flex-col">
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
        </section>

        <section className="rounded-3xl border border-red-500/40 bg-red-500/10 p-7 shadow-lg">
          <h2 className="text-xl font-semibold text-red-100">Subscription</h2>
          <p className="mt-3 text-sm text-red-200/90">
            You are currently on the {subscriptionTier} plan. Upgrade for unlimited pro templates and priority support.
          </p>
          <div className="mt-5 flex flex-wrap gap-4 text-sm">
            <Link href="/pricing" className="rounded-full bg-white px-4 py-2 font-semibold text-black transition hover:bg-zinc-200">
              Manage subscription
            </Link>
            <button
              onClick={logout}
              className="rounded-full border border-red-400 px-4 py-2 text-red-200 transition hover:bg-red-500/20"
            >
              Log out
            </button>
          </div>
        </section>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowEditProfile(false)}>
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-white/10 p-6 sm:p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Edit Profile</h2>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowChangePassword(false)}>
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-white/10 p-6 sm:p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowManageSubscription(false)}>
          <div className="bg-zinc-900 rounded-2xl shadow-xl border border-white/10 p-6 sm:p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Manage Subscription</h2>
            <ManageSubscriptionPanel
              isActive={isActive}
              plan={sub?.plan ?? null}
              validUntil={sub?.valid_until ?? null}
              onCancel={handleCancelSubscription}
              onUpgrade={() => { setShowManageSubscription(false); window.location.href = '/pricing'; }}
              onClose={() => setShowManageSubscription(false)}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Message Toast */}
      {message && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-800 border border-white/10 rounded-lg px-4 py-3 shadow-xl">
          <p className="text-sm text-white">{message}</p>
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

function ManageSubscriptionPanel({ isActive, plan, validUntil, onCancel, onUpgrade, onClose, loading }: { 
  isActive: boolean; 
  plan: string | null; 
  validUntil: string | null; 
  onCancel: () => void; 
  onUpgrade: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-lg bg-black/40 border border-white/10">
        <p className="text-sm text-zinc-300 mb-2">Current Status</p>
        <p className="text-lg font-semibold text-white">
          {isActive ? `${plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan - Active` : 'No Active Subscription'}
        </p>
        {validUntil && (
          <p className="text-xs text-zinc-400 mt-1">
            Valid until: {new Date(validUntil).toLocaleDateString()}
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

