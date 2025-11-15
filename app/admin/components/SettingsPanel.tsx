"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export default function SettingsPanel() {
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (res.ok && json.ok && json.settings) {
        setGeminiKey(json.settings.GEMINI_FLASH_API_KEY || '');
      }
    };
    load();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ settings: {
          GEMINI_FLASH_API_KEY: geminiKey,
        } }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Save failed');
      setMessage('Saved');
      setTimeout(() => setMessage(null), 2000);
    } catch (e: any) {
      setMessage(e?.message || 'Error');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Settings</h2>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-white">APIs</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Gemini 2.0 Flash API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Stored securely in the database (settings table). Used by server APIs.</p>
          </div>
          <button onClick={save} disabled={saving} className="h-9 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {message && <p className="mt-2 text-xs text-green-300">{message}</p>}
      </div>
    </div>
  );
}



