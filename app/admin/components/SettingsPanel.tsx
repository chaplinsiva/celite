"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export default function SettingsPanel() {
  const [geminiKey, setGeminiKey] = useState('');
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpSecret, setRzpSecret] = useState('');
  const [rzpCurrency, setRzpCurrency] = useState('INR');
  const [rzpMonthly, setRzpMonthly] = useState('799'); // ₹799 in Rupees
  const [rzpYearly, setRzpYearly] = useState('5499'); // ₹5,499 in Rupees
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
        setRzpKeyId(json.settings.RAZORPAY_KEY_ID || '');
        setRzpSecret(json.settings.RAZORPAY_KEY_SECRET || '');
        setRzpCurrency(json.settings.RAZORPAY_CURRENCY || 'INR');
        
        // Convert from paise (database) to rupees (display)
        let monthlyPaise = Number(json.settings.RAZORPAY_MONTHLY_AMOUNT || '79900');
        let yearlyPaise = Number(json.settings.RAZORPAY_YEARLY_AMOUNT || '549900');
        
        // Monthly: if >= 10000, it's in paise, convert to rupees (divide by 100)
        // Yearly: if >= 100000, it's in paise, convert to rupees (divide by 100)
        // Otherwise, it's already in rupees, use as is
        if (monthlyPaise >= 10000) {
          monthlyPaise = monthlyPaise / 100;
        }
        if (yearlyPaise >= 100000) {
          yearlyPaise = yearlyPaise / 100;
        }
        
        setRzpMonthly(String(Math.round(monthlyPaise)));
        setRzpYearly(String(Math.round(yearlyPaise)));
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
      
      // Convert from rupees (input) to paise (database storage)
      const monthlyPaise = String(Math.round(Number(rzpMonthly) * 100));
      const yearlyPaise = String(Math.round(Number(rzpYearly) * 100));
      
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ settings: {
          GEMINI_FLASH_API_KEY: geminiKey,
          RAZORPAY_KEY_ID: rzpKeyId,
          RAZORPAY_KEY_SECRET: rzpSecret,
          RAZORPAY_CURRENCY: rzpCurrency,
          RAZORPAY_MONTHLY_AMOUNT: monthlyPaise,
          RAZORPAY_YEARLY_AMOUNT: yearlyPaise,
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

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <h3 className="text-sm font-semibold text-white">Razorpay</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Key ID</label>
            <input type="text" value={rzpKeyId} onChange={(e)=>setRzpKeyId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Key Secret</label>
            <input type="password" value={rzpSecret} onChange={(e)=>setRzpSecret(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Currency</label>
            <input type="text" value={rzpCurrency} onChange={(e)=>setRzpCurrency(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Monthly Amount (₹ Rupees)</label>
              <input type="number" value={rzpMonthly} onChange={(e)=>setRzpMonthly(e.target.value)} placeholder="799" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Yearly Amount (₹ Rupees)</label>
              <input type="number" value={rzpYearly} onChange={(e)=>setRzpYearly(e.target.value)} placeholder="5499" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-sm" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <button onClick={save} disabled={saving} className="h-9 rounded-full bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">{saving ? 'Saving…' : 'Save Razorpay'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}



