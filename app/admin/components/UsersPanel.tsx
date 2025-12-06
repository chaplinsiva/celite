"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type UserRow = { id: string; email: string | null; first_name: string | null; last_name: string | null; created_at: string };

export default function UsersPanel() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());

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

  useEffect(() => { load(); }, []);

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
    </div>
  );
}



