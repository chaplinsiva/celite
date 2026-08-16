// agent-notes: { ctx: "Admin panel for Marketing Content Registry mapping platform IDs to human-readable names and products", deps: ["lib/supabaseClient.ts"], state: active, last: "sato@2026-08-16" }
"use client";

import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export type RegistryItem = {
  id?: string;
  platform: string;
  source: string;
  medium: string;
  campaign_name?: string | null;
  campaign_id?: string | null;
  adset_name?: string | null;
  adset_id?: string | null;
  ad_or_video_name?: string | null;
  ad_or_video_id?: string | null;
  content_name?: string | null;
  content_id?: string | null;
  product_slug?: string | null;
  destination_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
};

const PLATFORMS = ['All', 'Instagram', 'Facebook', 'YouTube', 'Google', 'Referral', 'Other'];

export default function MarketingSourcesRegistryPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<RegistryItem[]>([]);
  const [platformFilter, setPlatformFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<RegistryItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<RegistryItem>>({
    platform: 'Instagram',
    source: 'Instagram',
    medium: 'Paid Social',
    campaign_name: '',
    campaign_id: '',
    adset_name: '',
    adset_id: '',
    ad_or_video_name: '',
    ad_or_video_id: '',
    content_name: '',
    content_id: '',
    product_slug: '',
    destination_url: '/',
    is_active: true,
    notes: '',
  });

  const loadRegistry = async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setLoading(false); return; }

      const res = await fetch('/api/admin/marketing-registry', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || 'Failed to load registry');
        setLoading(false);
        return;
      }
      setMappings(json.data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      if (platformFilter !== 'All' && m.platform !== platformFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.campaign_name?.toLowerCase().includes(q) ||
          m.campaign_id?.toLowerCase().includes(q) ||
          m.ad_or_video_name?.toLowerCase().includes(q) ||
          m.ad_or_video_id?.toLowerCase().includes(q) ||
          m.product_slug?.toLowerCase().includes(q) ||
          m.source?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mappings, platformFilter, search]);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      platform: 'Instagram',
      source: 'Instagram',
      medium: 'Paid Social',
      campaign_name: '',
      campaign_id: '',
      adset_name: '',
      adset_id: '',
      ad_or_video_name: '',
      ad_or_video_id: '',
      content_name: '',
      content_id: '',
      product_slug: '',
      destination_url: '/',
      is_active: true,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: RegistryItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not signed in'); setSaving(false); return; }

      const res = await fetch('/api/admin/marketing-registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          id: editingItem?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        alert(json.error || 'Failed to save');
        setSaving(false);
        return;
      }

      setShowModal(false);
      loadRegistry();
    } catch (e: any) {
      alert(e?.message || 'Error saving mapping');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this marketing mapping?')) return;
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/marketing-registry?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        loadRegistry();
      }
    } catch (e: any) {
      alert(e?.message || 'Error deleting mapping');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            Marketing Content Registry
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">
              Human-Readable Names
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Map opaque Meta Ad IDs, YouTube Video IDs, and Google Campaign IDs to clear titles and product targets.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>＋</span> Add New Mapping
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                platformFilter === p
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by ID, Campaign, Ad, or Product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-1.5 text-xs rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Registry Table */}
      {loading ? (
        <div className="text-center py-12 text-zinc-400 text-xs font-medium">Loading marketing content registry…</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500 text-xs">{error}</div>
      ) : filteredMappings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-zinc-200 p-8 space-y-2">
          <div className="text-3xl">🎯</div>
          <div className="text-sm font-semibold text-zinc-800">No registry mappings found</div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Register your Meta Ad IDs, YouTube Video IDs, and Google Campaigns so attribution reports display friendly names.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Platform & Channel</th>
                  <th className="py-3 px-4">Campaign Name & ID</th>
                  <th className="py-3 px-4">Ad / Video / Creative</th>
                  <th className="py-3 px-4">Product Target</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {filteredMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900">{m.platform}</div>
                      <div className="text-[10px] text-zinc-400">{m.medium}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-900 font-semibold">{m.campaign_name || '—'}</div>
                      {m.campaign_id && (
                        <div className="text-[10px] text-zinc-400 font-mono">ID: {m.campaign_id}</div>
                      )}
                      {m.adset_name && (
                        <div className="text-[10px] text-blue-600">Ad Set: {m.adset_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-zinc-900 font-semibold">{m.ad_or_video_name || m.content_name || '—'}</div>
                      {(m.ad_or_video_id || m.content_id) && (
                        <div className="text-[10px] text-zinc-400 font-mono">ID: {m.ad_or_video_id || m.content_id}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {m.product_slug ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-mono border border-blue-200">
                          🎬 {m.product_slug}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-zinc-100 text-zinc-500 border border-zinc-200'
                        }`}
                      >
                        {m.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(m)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => m.id && handleDelete(m.id)}
                        className="text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-base font-bold text-zinc-900">
                {editingItem ? 'Edit Marketing Registry Mapping' : 'Register New Marketing Source / Ad'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Platform *</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value, source: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Google">Google</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Source Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.source || ''}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="e.g. Instagram"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Medium *</label>
                  <input
                    type="text"
                    required
                    value={formData.medium || ''}
                    onChange={(e) => setFormData({ ...formData, medium: e.target.value })}
                    placeholder="e.g. Paid Social"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Campaign Name</label>
                  <input
                    type="text"
                    value={formData.campaign_name || ''}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    placeholder="August Video Editors Campaign"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Campaign ID</label>
                  <input
                    type="text"
                    value={formData.campaign_id || ''}
                    onChange={(e) => setFormData({ ...formData, campaign_id: e.target.value })}
                    placeholder="120250719258570493"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Ad Set / Group Name</label>
                  <input
                    type="text"
                    value={formData.adset_name || ''}
                    onChange={(e) => setFormData({ ...formData, adset_name: e.target.value })}
                    placeholder="Video Editors India"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Ad Set ID</label>
                  <input
                    type="text"
                    value={formData.adset_id || ''}
                    onChange={(e) => setFormData({ ...formData, adset_id: e.target.value })}
                    placeholder="Optional ID"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Ad / Video Name</label>
                  <input
                    type="text"
                    value={formData.ad_or_video_name || ''}
                    onChange={(e) => setFormData({ ...formData, ad_or_video_name: e.target.value, content_name: e.target.value })}
                    placeholder="DC Blood Band Character Intro V2"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Ad / Video / Content ID</label>
                  <input
                    type="text"
                    value={formData.ad_or_video_id || ''}
                    onChange={(e) => setFormData({ ...formData, ad_or_video_id: e.target.value, content_id: e.target.value })}
                    placeholder="120250719263640493 or abc123"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Associated Product Slug</label>
                  <input
                    type="text"
                    value={formData.product_slug || ''}
                    onChange={(e) => setFormData({ ...formData, product_slug: e.target.value })}
                    placeholder="e.g. dc-blood-band-character-intro"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Destination URL</label>
                  <input
                    type="text"
                    value={formData.destination_url || ''}
                    onChange={(e) => setFormData({ ...formData, destination_url: e.target.value })}
                    placeholder="/product/dc-blood-band-character-intro"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="reg_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reg_active" className="font-semibold text-zinc-700 cursor-pointer">
                  Active in marketing rotation
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-semibold hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Mapping'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
