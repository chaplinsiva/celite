"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type UserRow = { id: string; email: string | null; first_name: string | null; last_name: string | null; created_at: string };
type CreatorShop = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  direct_upload_enabled: boolean;
  created_at: string;
  user_id: string;
  users: { id: string; email: string | null } | null;
};

export default function UsersPanel() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<'users' | 'creators'>('users');
  const [creatorShops, setCreatorShops] = useState<CreatorShop[]>([]);
  const [loadingCreators, setLoadingCreators] = useState(false);
  const [updatingShop, setUpdatingShop] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (!res.ok || !json.ok) { setError(json.error || 'Failed to load users'); setLoading(false); return; }
      setUsers(json.users);
      // Load admin ids for roles
      const { data: admins } = await supabase.from('admins').select('user_id');
      setAdminIds(new Set((admins ?? []).map((a: any) => a.user_id)));
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadCreators = async () => {
    try {
      setLoadingCreators(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/creator-shops', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (res.ok && json.ok) {
        setCreatorShops(json.shops || []);
      }
    } catch (e: any) {
      console.error('Failed to load creator shops:', e);
    } finally {
      setLoadingCreators(false);
    }
  };

  const toggleDirectUpload = async (shopId: string, enabled: boolean) => {
    try {
      setUpdatingShop(shopId);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/creator-shops', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shop_id: shopId, direct_upload_enabled: enabled }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        await loadCreators();
      } else {
        alert(json.error || 'Failed to update');
      }
    } catch (e: any) {
      alert('Failed to update: ' + (e?.message || 'Unknown error'));
    } finally {
      setUpdatingShop(null);
    }
  };

  useEffect(() => { 
    load(); 
    if (tab === 'creators') {
      loadCreators();
    }
  }, [tab]);

  const remove = async (id: string) => {
    try {
      if (!confirm('Delete this user? This cannot be undone.')) return;
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ id })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) { alert(json.error || 'Delete failed'); return; }
      await load();
    } catch { }
  };

  if (loading) return <div className="text-sm text-zinc-500">Loading users…</div>;
  if (error) return <div className="text-sm text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-900">User Management</h2>
        <p className="mt-1 text-sm text-zinc-500">View users and manage accounts.</p>
      </div>

      {/* Tabs */}
      <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs font-medium">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-md transition-all ${tab === 'users' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Users
        </button>
        <button
          onClick={() => setTab('creators')}
          className={`px-4 py-2 rounded-md transition-all ${tab === 'creators' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
        >
          Creator Shops
        </button>
      </div>

      {tab === 'users' && (

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50/80 border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 font-semibold">
            <tr>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Name</th>
              <th className="px-5 py-3.5">Email</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((u) => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email ? u.email.split('@')[0] : '');
              const role = adminIds.has(u.id) ? 'Admin' : 'User';
              return (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${role === 'Admin'
                        ? 'bg-purple-50 text-purple-700 ring-purple-600/20'
                        : 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                      }`}>
                      {role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-zinc-900">{name}</td>
                  <td className="px-5 py-3.5 text-zinc-600">{u.email}</td>
                  <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end">
                      <button
                        onClick={() => remove(u.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-zinc-500 italic">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      {tab === 'creators' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Creator Shops</h3>
            <p className="mt-1 text-sm text-zinc-500">Manage creator shops and enable/disable direct upload access.</p>
          </div>

          {loadingCreators ? (
            <div className="text-sm text-zinc-500">Loading creator shops…</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-50/80 border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500 font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Shop Name</th>
                    <th className="px-5 py-3.5">Slug</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Direct Upload</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {creatorShops.map((shop) => (
                    <tr key={shop.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-zinc-900">{shop.name}</td>
                      <td className="px-5 py-3.5 text-zinc-600 font-mono text-xs">{shop.slug}</td>
                      <td className="px-5 py-3.5 text-zinc-600">{shop.users?.email || 'N/A'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                          shop.direct_upload_enabled
                            ? 'bg-green-50 text-green-700 ring-green-600/20'
                            : 'bg-zinc-50 text-zinc-600 ring-zinc-500/10'
                        }`}>
                          {shop.direct_upload_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">{new Date(shop.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => toggleDirectUpload(shop.id, !shop.direct_upload_enabled)}
                            disabled={updatingShop === shop.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              shop.direct_upload_enabled
                                ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                : 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {updatingShop === shop.id
                              ? 'Updating...'
                              : shop.direct_upload_enabled
                              ? 'Disable Direct Upload'
                              : 'Enable Direct Upload'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {creatorShops.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-500 italic">
                        No creator shops found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



