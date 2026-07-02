"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export default function SettingsPanel() {
  const [geminiKey, setGeminiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fixingRenewals, setFixingRenewals] = useState(false);
  const [fixResults, setFixResults] = useState<any>(null);
  const [fixingTimestamps, setFixingTimestamps] = useState(false);
  const [fixTimestampResults, setFixTimestampResults] = useState<any>(null);
  const [fixingPongal, setFixingPongal] = useState(false);
  const [fixPongalResults, setFixPongalResults] = useState<any>(null);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [updatingMaintenance, setUpdatingMaintenance] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const json = await res.json();
      if (res.ok && json.ok && json.settings) {
        setGeminiKey(json.settings.GEMINI_FLASH_API_KEY || '');
        setMaintenanceOn(json.settings.MAINTENANCE_MODE === 'on');
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
        body: JSON.stringify({
          settings: {
            GEMINI_FLASH_API_KEY: geminiKey,
            MAINTENANCE_MODE: maintenanceOn ? 'on' : 'off',
          }
        }),
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

  const toggleMaintenance = async (next: boolean) => {
    try {
      setUpdatingMaintenance(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          settings: {
            GEMINI_FLASH_API_KEY: geminiKey,
            MAINTENANCE_MODE: next ? 'on' : 'off',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Update failed');
      setMaintenanceOn(next);
      setMessage(next ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
      setTimeout(() => setMessage(null), 3000);
    } catch (e: any) {
      setMessage(e?.message || 'Error updating maintenance mode');
      setTimeout(() => setMessage(null), 4000);
    } finally {
      setUpdatingMaintenance(false);
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

  const fixSubscriptionTimestamps = async () => {
    if (!confirm('This will update the updated_at timestamp for all active subscriptions that have valid_until in the future. This fixes subscriptions where autopay payments were processed but the timestamp wasn\'t updated. Continue?')) {
      return;
    }

    try {
      setFixingTimestamps(true);
      setFixTimestampResults(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please refresh the page.');
        return;
      }

      const res = await fetch('/api/admin/fix-subscription-timestamps', {
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

      setFixTimestampResults(json);
      setMessage(`Updated timestamps for ${json.updated} subscriptions. Skipped: ${json.skipped}`);
      setTimeout(() => setMessage(null), 10000);
    } catch (e: any) {
      setMessage(e?.message || 'Error fixing timestamps');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setFixingTimestamps(false);
    }
  };

  const fixPongalValidity = async () => {
    if (!confirm('This will check all Pongal weekly subscriptions and fix any where autopay payments were deducted but validity was not extended. Continue?')) {
      return;
    }

    try {
      setFixingPongal(true);
      setFixPongalResults(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage('Session expired. Please refresh the page.');
        return;
      }

      const res = await fetch('/api/admin/fix-pongal-validity', {
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

      setFixPongalResults(json);
      setMessage(`Processed ${json.details?.fixed?.length || 0} Pongal subscriptions. Fixed: ${json.fixed}, Skipped: ${json.skipped}, Errors: ${json.errors}`);
      setTimeout(() => setMessage(null), 10000);
    } catch (e: any) {
      setMessage(e?.message || 'Error fixing Pongal validity');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setFixingPongal(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-zinc-900">Settings</h2>

      {/* API Settings */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">APIs</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Gemini 2.0 Flash API Key</label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full px-3 py-2 rounded-lg bg-zinc-50 border border-zinc-200 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <p className="mt-1 text-[11px] text-zinc-500">Stored securely in the database (settings table). Used by server APIs.</p>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {message && <p className="mt-3 text-sm font-medium text-green-600">{message}</p>}
      </div>

      {/* Maintenance Mode */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Site Maintenance Mode</h3>
        <p className="mt-2 text-xs text-zinc-500 leading-relaxed max-w-2xl">
          When maintenance mode is enabled, the public site is hidden for normal users and shows a maintenance message
          with only a login option. Admins can still access the full website and admin panel.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
          <div>
            <p className="text-sm font-medium text-zinc-900">
              {maintenanceOn ? 'Maintenance mode is currently ON' : 'Maintenance mode is currently OFF'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {maintenanceOn
                ? 'Only admins can browse the site. Visitors see the maintenance screen.'
                : 'Site is fully visible to all visitors.'}
            </p>
          </div>
          <button
            onClick={() => toggleMaintenance(!maintenanceOn)}
            disabled={updatingMaintenance}
            className={`rounded-lg px-6 py-2 text-sm font-semibold transition-all shadow-sm ${maintenanceOn
              ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {updatingMaintenance
              ? 'Updating...'
              : maintenanceOn
                ? 'Disable Maintenance'
                : 'Enable Maintenance'}
          </button>
        </div>
      </div>

      {/* Subscription Maintenance */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Subscription Maintenance</h3>
        <div className="mt-4 space-y-6">
          <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100">
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Fix users whose autopay payments were deducted but subscription validity was not updated.
              This script will verify all active autopay subscriptions with Razorpay and update valid_until for affected users.
            </p>
            <button
              onClick={fixSubscriptionRenewals}
              disabled={fixingRenewals}
              className="rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:from-pink-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {fixingRenewals ? 'Processing...' : 'Fix Subscription Renewals'}
            </button>

            {fixResults && (
              <div className="mt-4 p-4 rounded-lg bg-white border border-zinc-200 shadow-sm">
                <p className="text-xs font-semibold text-zinc-900 mb-2">Results:</p>
                <div className="space-y-1 text-xs">
                  <p className="text-green-600 font-medium">✓ Fixed: {fixResults.fixed}</p>
                  <p className="text-amber-600 font-medium">⊘ Skipped: {fixResults.skipped}</p>
                  {fixResults.errors > 0 && <p className="text-red-600 font-medium">✗ Errors: {fixResults.errors}</p>}
                </div>

                {fixResults.details?.fixed && fixResults.details.fixed.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-900 mb-2">Fixed Users:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {fixResults.details.fixed.map((fix: any, idx: number) => (
                        <div key={idx} className="text-xs text-zinc-600">
                          <span className="font-mono text-zinc-900">{fix.user_id.slice(0, 8)}...</span> - {fix.plan} plan
                          <span className="text-zinc-400 ml-2">
                            ({new Date(fix.old_valid_until).toLocaleDateString()} → {new Date(fix.new_valid_until).toLocaleDateString()})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fixResults.details?.errors && fixResults.details.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-red-600 mb-2">Errors:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {fixResults.details.errors.map((error: any, idx: number) => (
                        <div key={idx} className="text-xs text-red-500">
                          <span className="font-mono">{error.user_id.slice(0, 8)}...</span>: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fix Pongal Weekly Validity */}
          <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
            <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
              Fix Pongal weekly subscriptions where autopay payments were deducted but validity was not extended.
              This checks Razorpay payment counts and updates valid_until for affected users.
            </p>
            <button
              onClick={fixPongalValidity}
              disabled={fixingPongal}
              className="rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2 text-sm font-semibold text-white hover:from-orange-700 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              {fixingPongal ? 'Processing...' : 'Fix Pongal Weekly Validity'}
            </button>

            {fixPongalResults && (
              <div className="mt-4 p-4 rounded-lg bg-white border border-zinc-200 shadow-sm">
                <p className="text-xs font-semibold text-zinc-900 mb-2">Results:</p>
                <div className="space-y-1 text-xs">
                  <p className="text-green-600 font-medium">✓ Fixed: {fixPongalResults.fixed}</p>
                  <p className="text-amber-600 font-medium">⊘ Skipped: {fixPongalResults.skipped}</p>
                  {fixPongalResults.errors > 0 && <p className="text-red-600 font-medium">✗ Errors: {fixPongalResults.errors}</p>}
                </div>

                {fixPongalResults.details?.fixed && fixPongalResults.details.fixed.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-900 mb-2">Fixed Users:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {fixPongalResults.details.fixed.map((fix: any, idx: number) => (
                        <div key={idx} className="text-xs text-zinc-600">
                          <span className="font-mono text-zinc-900">{fix.user_id.slice(0, 8)}...</span>
                          <span className="text-zinc-400 ml-2">
                            ({fix.old_valid_until === 'null' ? 'null' : new Date(fix.old_valid_until).toLocaleDateString()} → {new Date(fix.new_valid_until).toLocaleDateString()})
                          </span>
                          <span className="text-zinc-500 ml-2 italic">{fix.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {fixPongalResults.details?.errors && fixPongalResults.details.errors.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-100">
                    <p className="text-xs font-semibold text-red-600 mb-2">Errors:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {fixPongalResults.details.errors.map((error: any, idx: number) => (
                        <div key={idx} className="text-xs text-red-500">
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

      {/* Timestamp Fixes */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Fix Subscription Timestamps</h3>
        <div className="mt-4 p-4 rounded-lg bg-zinc-50 border border-zinc-100">
          <p className="text-xs text-zinc-600 mb-3 leading-relaxed">
            Update the updated_at timestamp for active subscriptions that have valid_until in the future.
            This fixes subscriptions where autopay payments were processed but the updated_at field wasn't updated.
          </p>
          <button
            onClick={fixSubscriptionTimestamps}
            disabled={fixingTimestamps}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:from-blue-700 hover:to-cyan-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {fixingTimestamps ? 'Processing...' : 'Fix Subscription Timestamps'}
          </button>

          {fixTimestampResults && (
            <div className="mt-4 p-4 rounded-lg bg-white border border-zinc-200 shadow-sm">
              <p className="text-xs font-semibold text-zinc-900 mb-2">Results:</p>
              <div className="space-y-1 text-xs">
                <p className="text-green-600 font-medium">✓ Updated: {fixTimestampResults.updated}</p>
                <p className="text-amber-600 font-medium">⊘ Skipped: {fixTimestampResults.skipped}</p>
              </div>

              {fixTimestampResults.details?.updated && fixTimestampResults.details.updated.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <p className="text-xs font-semibold text-zinc-900 mb-2">Updated Subscriptions:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fixTimestampResults.details.updated.map((update: any, idx: number) => (
                      <div key={idx} className="text-xs text-zinc-600">
                        <span className="font-mono text-zinc-900">{update.user_id.slice(0, 8)}...</span> - {update.plan} plan
                        <span className="text-zinc-400 ml-2">
                          ({new Date(update.old_updated_at).toLocaleDateString()} → {new Date(update.new_updated_at).toLocaleDateString()})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {fixTimestampResults.details?.skipped && fixTimestampResults.details.skipped.length > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-100">
                  <p className="text-xs font-semibold text-amber-600 mb-2">Skipped:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {fixTimestampResults.details.skipped.slice(0, 10).map((skip: any, idx: number) => (
                      <div key={idx} className="text-xs text-zinc-500">
                        <span className="font-mono">{skip.user_id.slice(0, 8)}...</span>: {skip.reason}
                      </div>
                    ))}
                    {fixTimestampResults.details.skipped.length > 10 && (
                      <div className="text-xs text-zinc-400 italic">... and {fixTimestampResults.details.skipped.length - 10} more</div>
                    )}
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



