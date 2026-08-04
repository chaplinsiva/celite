/* agent-notes: { ctx: "Admin media compressor UI with local video transcoding & side-by-side inspection before R2 sync", deps: ["lib/mediaUtils.ts", "lib/supabaseClient.ts"], state: active, last: "sato@2026-07-28" } */

"use client";

import { useEffect, useState, useMemo } from 'react';
import { Sliders, Download, Check, RefreshCw, Eye, Sparkles, AlertCircle, FileArchive, Zap, ArrowRight, ShieldCheck, Play, ArrowLeftRight, Film, Image as ImageIcon, HardDrive, Trash2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { formatBytes, calculateSavings } from '../../../lib/mediaUtils';
import { convertR2UrlToCdn } from '../../../lib/utils';

type TemplateItem = {
  slug: string;
  name: string;
  category_id?: string | null;
  img: string | null;
  thumbnail_path?: string | null;
  video_path?: string | null;
  created_at?: string;
  status?: string;
};

type InspectionTarget = {
  template: TemplateItem;
  mediaType: 'thumbnail' | 'video';
  originalUrl: string;
  originalSize: number;
  localPreviewUrl?: string;
  compressedSize?: number;
  savingsPercent?: number;
  savingsBytesFormatted?: string;
  isProcessing?: boolean;
  processingMessage?: string;
};

export default function MediaCompressorPanel() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'uncompressed' | 'videos' | 'images'>('all');
  const [quality, setQuality] = useState<number>(80); // WebP Quality
  const [targetResolution, setTargetResolution] = useState<'720p' | '1080p' | '480p'>('720p');
  const [inspectionTarget, setInspectionTarget] = useState<InspectionTarget | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('templates')
        .select('slug, name, category_id, img, thumbnail_path, video_path, created_at, status')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates((data as TemplateItem[]) || []);
    } catch (err: any) {
      console.error('Failed to load templates for compression:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      if (filterType === 'videos') return !!t.video_path;
      if (filterType === 'images') return !!(t.thumbnail_path || t.img);
      if (filterType === 'uncompressed') {
        const thumb = t.thumbnail_path || t.img;
        return (thumb && !thumb.includes('.webp')) || (t.video_path && !t.video_path.includes('-compressed-'));
      }
      return true;
    });
  }, [templates, search, filterType]);

  // Transcode & Compress locally first via /api/admin/media/compress-local
  const handleInspectCompression = async (template: TemplateItem, mediaType: 'thumbnail' | 'video') => {
    const rawUrl = mediaType === 'video' ? template.video_path : (template.thumbnail_path || template.img);
    if (!rawUrl) return;

    const originalUrl = convertR2UrlToCdn(rawUrl) || rawUrl;
    
    // Fetch actual original asset size via HEAD
    let originalSize = 1024 * 1024 * 5;
    try {
      const res = await fetch(originalUrl, { method: 'HEAD' });
      const contentLength = res.headers.get('content-length');
      if (contentLength) originalSize = parseInt(contentLength, 10);
    } catch (e) {}

    setInspectionTarget({
      template,
      mediaType,
      originalUrl,
      originalSize,
      isProcessing: true,
      processingMessage: mediaType === 'video' ? 'Running local video compression via FFmpeg (H.264 MP4)...' : 'Generating local WebP thumbnail...'
    });

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Trigger local real video/image compression
      const res = await fetch('/api/admin/media/compress-local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          slug: template.slug,
          mediaType,
          quality,
          targetResolution
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Local media compression failed');

      setInspectionTarget((prev) => prev ? {
        ...prev,
        localPreviewUrl: json.localPreviewUrl,
        compressedSize: json.compressedSize,
        originalSize: json.originalSize || prev.originalSize,
        savingsPercent: json.savingsPercent,
        savingsBytesFormatted: json.savingsBytesFormatted,
        isProcessing: false
      } : null);
    } catch (err: any) {
      console.error('Local compression error:', err);
      setActionFeedback(`❌ Local Compression Failed: ${err?.message || 'Unknown error'}`);
      setInspectionTarget(null);
    }
  };

  // Upload local compressed asset to Cloudflare R2
  const handleApproveAndUploadR2 = async () => {
    if (!inspectionTarget || !inspectionTarget.localPreviewUrl) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/media/compress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          slug: inspectionTarget.template.slug,
          mediaType: inspectionTarget.mediaType,
          quality,
          targetResolution
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Cloudflare R2 upload failed');

      setActionFeedback(`✅ Successfully pushed compressed ${inspectionTarget.mediaType} to Cloudflare R2 for ${inspectionTarget.template.name}! Saved ${json.savingsPercent}% file size.`);
      setInspectionTarget(null);
      await loadTemplates();
    } catch (err: any) {
      console.error('R2 upload error:', err);
      setActionFeedback(`❌ Cloudflare R2 Error: ${err?.message || 'Failed to upload to R2'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keep local compressed preview in database (fallback if R2 not configured)
  const handleKeepLocalOnly = async () => {
    if (!inspectionTarget || !inspectionTarget.localPreviewUrl) return;
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const updatePayload: Record<string, any> = {};
      if (inspectionTarget.mediaType === 'video') {
        updatePayload.video_path = inspectionTarget.localPreviewUrl;
      } else {
        updatePayload.thumbnail_path = inspectionTarget.localPreviewUrl;
      }

      const { error } = await supabase
        .from('templates')
        .update(updatePayload)
        .eq('slug', inspectionTarget.template.slug);

      if (error) throw error;

      setActionFeedback(`✅ Saved local compressed ${inspectionTarget.mediaType} for ${inspectionTarget.template.name}`);
      setInspectionTarget(null);
      await loadTemplates();
    } catch (err: any) {
      setActionFeedback(`❌ Failed to update local preview: ${err?.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Restore Original Asset
  const handleRestoreOriginal = async (template: TemplateItem, mediaType: 'thumbnail' | 'video') => {
    if (!confirm(`Restore original uncompressed ${mediaType} for ${template.name}?`)) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/admin/media/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          slug: template.slug,
          mediaType
        })
      });

      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to restore asset');

      setActionFeedback(`✅ Restored original ${mediaType} for ${template.name}`);
      await loadTemplates();
    } catch (err: any) {
      console.error('Restore asset error:', err);
      setActionFeedback(`❌ Error: ${err?.message || 'Failed to restore'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-purple-950 text-white rounded-2xl p-6 md:p-8 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Local-First Video & Image Compressor
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-white">Transcode Locally First, Decide Before R2 Push</h2>
          <p className="text-blue-200/90 text-sm md:text-base leading-relaxed">
            Compress videos & thumbnails locally via FFmpeg/Sharp. Play and inspect compressed files side-by-side with original videos before pushing to Cloudflare R2.
          </p>
        </div>
      </div>

      {/* Action Toast Feedback */}
      {actionFeedback && (
        <div className="p-4 rounded-xl bg-zinc-900 text-white text-sm font-medium flex items-center justify-between shadow-lg animate-in fade-in">
          <span>{actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-zinc-400 hover:text-white text-xs underline ml-4">Dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 text-xs font-bold">
            {(['all', 'uncompressed', 'images', 'videos'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${filterType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-purple-50/60 border border-purple-100 px-3 py-1.5 rounded-xl text-xs">
            <Film className="w-3.5 h-3.5 text-purple-600" />
            <span className="font-bold text-purple-900">Video Target:</span>
            <select
              value={targetResolution}
              onChange={(e) => setTargetResolution(e.target.value as any)}
              className="bg-white border border-purple-200 rounded-lg px-2 py-1 font-bold text-purple-900 text-xs focus:outline-none"
            >
              <option value="720p">720p HD (Recommended)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="480p">480p Mobile</option>
            </select>
          </div>

          <div className="flex items-center gap-3 bg-blue-50/60 border border-blue-100 px-3 py-1.5 rounded-xl text-xs">
            <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold text-blue-900">WebP Quality:</span>
            <input
              type="range"
              min="50"
              max="95"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-20 accent-blue-600"
            />
            <span className="font-mono text-blue-700 font-bold">{quality}%</span>
          </div>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-medium">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" /> Loading templates for compression...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No templates found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Template</th>
                  <th className="py-3.5 px-4">Thumbnail Asset</th>
                  <th className="py-3.5 px-4">Video Preview</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {filteredTemplates.map((t) => {
                  const thumbUrl = t.thumbnail_path || t.img;
                  const isThumbWebp = thumbUrl?.includes('.webp');
                  const isVideoCompressed = t.video_path?.includes('compressed-');

                  return (
                    <tr key={t.slug} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-zinc-900">
                        <div className="flex items-center gap-3">
                          <img
                            src={convertR2UrlToCdn(thumbUrl) || '/PNG1.png'}
                            alt={t.name}
                            className="w-10 h-10 rounded-lg object-cover border border-zinc-200 flex-shrink-0"
                            onError={(e) => { e.currentTarget.src = '/PNG1.png'; }}
                          />
                          <div>
                            <p className="font-bold text-zinc-900 truncate max-w-xs">{t.name}</p>
                            <p className="text-xs font-mono text-zinc-400">{t.slug}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {thumbUrl ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${isThumbWebp ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>
                              {isThumbWebp ? 'WebP Optimized' : 'Standard Image'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">No Thumbnail</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {t.video_path ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${isVideoCompressed ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-800'}`}>
                              {isVideoCompressed ? 'Optimized Stream' : 'Original Video'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 italic">No Video</span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right space-x-2">
                        {thumbUrl && (
                          <button
                            onClick={() => handleInspectCompression(t, 'thumbnail')}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Sparkles className="w-3.5 h-3.5" /> Compress WebP
                          </button>
                        )}

                        {t.video_path && (
                          <button
                            onClick={() => handleInspectCompression(t, 'video')}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors inline-flex items-center gap-1"
                          >
                            <Zap className="w-3.5 h-3.5" /> Transcode Video Locally
                          </button>
                        )}

                        <button
                          onClick={() => handleRestoreOriginal(t, t.video_path ? 'video' : 'thumbnail')}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 text-xs font-medium transition-colors"
                          title="Restore Original Asset"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side-by-Side Local Inspection Modal */}
      {inspectionTarget && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl border border-zinc-200 overflow-hidden relative max-h-[92vh] flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 font-bold text-xs rounded-full uppercase tracking-wider">
                  Local Inspection & Playback Verification
                </span>
                <h3 className="text-xl font-bold text-zinc-900 mt-1">
                  Local {inspectionTarget.mediaType} Compression for {inspectionTarget.template.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectionTarget(null)}
                className="text-zinc-400 hover:text-zinc-800 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Side-by-Side Player */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto p-2 flex-grow">
              {/* Original Card */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex flex-col items-center">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Original Asset</span>
                <div className="aspect-video w-full rounded-xl bg-black overflow-hidden flex items-center justify-center relative border border-zinc-300">
                  {inspectionTarget.mediaType === 'video' ? (
                    <video src={inspectionTarget.originalUrl} controls className="max-w-full max-h-full" />
                  ) : (
                    <img src={inspectionTarget.originalUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                  )}
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-zinc-800">{formatBytes(inspectionTarget.originalSize)}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate max-w-xs">{inspectionTarget.originalUrl}</p>
                </div>
              </div>

              {/* Local Compressed Card */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-2xl p-4 flex flex-col items-center relative">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Local Compressed Result</span>
                  {inspectionTarget.savingsPercent !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-green-500 text-white font-extrabold text-[10px]">
                      -{inspectionTarget.savingsPercent}% SAVINGS
                    </span>
                  )}
                </div>

                <div className="aspect-video w-full rounded-xl bg-black overflow-hidden flex items-center justify-center relative border border-purple-300">
                  {inspectionTarget.isProcessing ? (
                    <div className="text-white text-xs font-bold flex flex-col items-center gap-2 p-6 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                      <span>{inspectionTarget.processingMessage || 'Compressing locally...'}</span>
                      <span className="text-[11px] text-zinc-400 font-normal">Transcoding H.264 video / encoding WebP image locally</span>
                    </div>
                  ) : inspectionTarget.mediaType === 'video' ? (
                    <video src={inspectionTarget.localPreviewUrl} controls autoPlay muted loop className="max-w-full max-h-full" />
                  ) : (
                    <img src={inspectionTarget.localPreviewUrl} alt="Local Compressed WebP" className="max-w-full max-h-full object-contain" />
                  )}
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-extrabold text-purple-900">
                    {inspectionTarget.compressedSize ? formatBytes(inspectionTarget.compressedSize) : 'Calculating size...'}
                  </p>
                  <p className="text-xs text-green-600 font-bold mt-0.5">
                    Target: {inspectionTarget.mediaType === 'video' ? `H.264 ${targetResolution} MP4` : `WebP Image (${quality}% Quality)`}
                  </p>
                </div>
              </div>
            </div>

            {/* Decision Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                onClick={() => setInspectionTarget(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-300 font-bold text-zinc-700 text-sm hover:bg-zinc-100 transition-colors"
                disabled={isSubmitting}
              >
                Discard
              </button>
              <button
                onClick={handleKeepLocalOnly}
                disabled={isSubmitting || inspectionTarget.isProcessing || !inspectionTarget.localPreviewUrl}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-900 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                <HardDrive className="w-4 h-4" /> Save Locally Only
              </button>
              <button
                onClick={handleApproveAndUploadR2}
                disabled={isSubmitting || inspectionTarget.isProcessing || !inspectionTarget.localPreviewUrl}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Uploading to Cloudflare R2...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Approve & Upload to Cloudflare R2
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
