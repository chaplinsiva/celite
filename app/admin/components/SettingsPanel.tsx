"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export default function SettingsPanel() {
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fixingRenewals, setFixingRenewals] = useState(false);
  const [fixResults, setFixResults] = useState<any>(null);

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

  const fixSubscriptionRenewals = async () => {
    if (!confirm('This will check all active autopay subscriptions and fix any that have payments deducted but validity not extended. Continue?')) {
      return;
    }
    
    try {
      setFixingRenewals(true);
      setFixResults(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please refresh the page.');
        return;
      }
      
      const res = await fetch('/api/admin/fix-subscription-renewals', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}` 
        },
      });
      
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Fix failed');
      }
      
      setFixResults(json);
      setMessage(`Processed ${json.details?.fixed?.length || 0} subscriptions. Fixed: ${json.fixed}, Skipped: ${json.skipped}, Errors: ${json.errors}`);
      setTimeout(() => setMessage(null), 10000);
    } catch (e: any) {
      setMessage(e?.message || 'Error fixing renewals');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setFixingRenewals(false);
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
        <h3 className="text-sm font-semibold text-white">Subscription Maintenance</h3>
        <div className="mt-3 space-y-3">
          <div>
            <p className="text-xs text-zinc-400 mb-2">
              Fix users whose autopay payments were deducted but subscription validity was not updated.
              This script will verify all active autopay subscriptions with Razorpay and update valid_until for affected users.
            </p>
            <button 
              onClick={fixSubscriptionRenewals} 
              disabled={fixingRenewals}
              className="rounded-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white hover:from-pink-600 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {fixingRenewals ? 'Processing...' : 'Fix Subscription Renewals'}
            </button>
          </div>
          
          {fixResults && (
            <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/10">
              <p className="text-xs font-semibold text-white mb-2">Results:</p>
              <div className="space-y-1 text-xs">
                <p className="text-green-300">✓ Fixed: {fixResults.fixed}</p>
                <p className="text-yellow-300">⊘ Skipped: {fixResults.skipped}</p>
                {fixResults.errors > 0 && <p className="text-red-300">✗ Errors: {fixResults.errors}</p>}
              </div>
              
              {fixResults.details?.fixed && fixResults.details.fixed.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-white mb-2">Fixed Users:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fixResults.details.fixed.map((fix: any, idx: number) => (
                      <div key={idx} className="text-xs text-zinc-300">
                        <span className="font-mono">{fix.user_id.slice(0, 8)}...</span> - {fix.plan} plan
                        <span className="text-zinc-500 ml-2">
                          ({new Date(fix.old_valid_until).toLocaleDateString()} → {new Date(fix.new_valid_until).toLocaleDateString()})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {fixResults.details?.errors && fixResults.details.errors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs font-semibold text-red-300 mb-2">Errors:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fixResults.details.errors.map((error: any, idx: number) => (
                      <div key={idx} className="text-xs text-red-300">
                        <span className="font-mono">{error.user_id.slice(0, 8)}...</span>: {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



