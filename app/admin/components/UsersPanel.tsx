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
    } catch {}
  };

  if (loading) return <div>Loading users…</div>;
  if (error) return <div className="text-sm text-red-300">{error}</div>;

  return (
    <div>
      <h2 className="text-xl font-semibold">User Management</h2>
      <p className="mt-2 text-sm text-zinc-400">View users and remove accounts.</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.email ? u.email.split('@')[0] : '');
              const role = adminIds.has(u.id) ? 'Admin' : 'User';
              return (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-zinc-300">{role}</td>
                  <td className="px-4 py-3 text-white">{name}</td>
                  <td className="px-4 py-3 text-zinc-300">{u.email}</td>
                  <td className="px-4 py-3 text-zinc-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <button onClick={() => remove(u.id)} className="rounded-full border border-red-400 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10">Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



