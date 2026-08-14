// agent-notes: ctx="Admin panel Video Preview Compressor component with 10-per-page pagination, FFmpeg WASM and Cloudflare R2 replacement", deps="@ffmpeg/ffmpeg, @ffmpeg/util, components/ui, lib/utils", state="active", last="vteam@2026-08-02"
"use client";

import { useEffect, useState, useRef } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import { convertR2UrlToCdn } from '../../../lib/utils';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import {
  Video,
  Minimize2,
  Upload,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  RefreshCw,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface TemplateItem {
  id: string;
  name: string;
  slug: string;
  video_path: string | null;
  category?: string;
  originalSizeMb?: number | null;
}

interface CompressionResult {
  templateId: string;
  compressedBlob: Blob;
  compressedUrl: string;
  compressedSizeMb: number;
  savingsPercent: number;
}

const ITEMS_PER_PAGE = 10;

export default function VideoCompressorPanel() {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // FFmpeg State
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // Results & Replacements
  const [results, setResults] = useState<Record<string, CompressionResult>>({});
  const [confirmingReplace, setConfirmingReplace] = useState<TemplateItem | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchVideoTemplates();
  }, []);

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchVideoTemplates = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('templates')
        .select('slug, name, video_path, video')
        .order('name');

      if (error) {
        console.error('Supabase query error:', error.message || error);
        throw error;
      }

      const items: TemplateItem[] = (data || [])
        .filter((t: any) => Boolean(t.video_path || t.video))
        .map((t: any) => ({
          id: t.slug,
          name: t.name,
          slug: t.slug,
          video_path: t.video_path || t.video,
        }));

      setTemplates(items);

      // Asynchronously fetch file sizes
      items.forEach(async (item) => {
        const rawUrl = item.video_path;
        if (!rawUrl) return;
        const cdnUrl = convertR2UrlToCdn(rawUrl) || rawUrl;
        try {
          const res = await fetch(cdnUrl, { method: 'HEAD' });
          const contentLength = res.headers.get('content-length');
          if (contentLength) {
            const bytes = parseInt(contentLength, 10);
            const mb = parseFloat((bytes / (1024 * 1024)).toFixed(2));
            setTemplates((prev) =>
              prev.map((t) => (t.id === item.id ? { ...t, originalSizeMb: mb } : t))
            );
          }
        } catch (e) {
          console.warn(`Could not fetch HEAD for ${cdnUrl}:`, e);
        }
      });
    } catch (err: any) {
      console.error('Error fetching video templates:', err.message || err);
      setStatusMessage({
        type: 'error',
        text: `Failed to load video templates: ${err.message || 'Database error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current && ffmpegLoaded) return ffmpegRef.current;
    setFfmpegLoading(true);
    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.min(99, Math.round(progress * 100)));
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      const coreURL = `${baseURL}/ffmpeg-core.js`;
      const wasmURL = `${baseURL}/ffmpeg-core.wasm`;

      // Fetch and create Blob URLs using standard browser fetch (avoids Next.js dynamic import issues)
      const [coreRes, wasmRes] = await Promise.all([
        fetch(coreURL),
        fetch(wasmURL),
      ]);

      if (!coreRes.ok || !wasmRes.ok) {
        throw new Error('Failed to fetch FFmpeg core/wasm binaries from CDN');
      }

      const coreBlob = await coreRes.blob();
      const wasmBlob = await wasmRes.blob();

      const coreBlobUrl = URL.createObjectURL(new Blob([coreBlob], { type: 'text/javascript' }));
      const wasmBlobUrl = URL.createObjectURL(new Blob([wasmBlob], { type: 'application/wasm' }));

      await ffmpeg.load({
        coreURL: coreBlobUrl,
        wasmURL: wasmBlobUrl,
      });

      ffmpegRef.current = ffmpeg;
      setFfmpegLoaded(true);
      return ffmpeg;
    } catch (err: any) {
      console.error('Failed to load FFmpeg WASM:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to load browser FFmpeg compression engine: ${err.message || 'Network error'}`,
      });
      throw err;
    } finally {
      setFfmpegLoading(false);
    }
  };

  const compressVideo = async (template: TemplateItem) => {
    const rawUrl = template.video_path;
    if (!rawUrl) return;

    setCompressingId(template.id);
    setProgress(0);
    setStatusMessage(null);

    try {
      const ffmpeg = await loadFFmpeg();
      const cdnUrl = convertR2UrlToCdn(rawUrl) || rawUrl;

      // Fetch video file binary
      const fileData = await fetchFile(cdnUrl);
      await ffmpeg.writeFile('input.mp4', fileData);

      // Run FFmpeg H.264 video compression
      await ffmpeg.exec([
        '-i',
        'input.mp4',
        '-vcodec',
        'libx264',
        '-crf',
        '28',
        '-preset',
        'fast',
        '-acodec',
        'aac',
        'output.mp4',
      ]);

      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data as any], { type: 'video/mp4' });
      const compressedUrl = URL.createObjectURL(blob);
      const compressedSizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

      const origSize = template.originalSizeMb || compressedSizeMb + 1;
      const savingsPercent = Math.max(0, Math.round(((origSize - compressedSizeMb) / origSize) * 100));

      setResults((prev) => ({
        ...prev,
        [template.id]: {
          templateId: template.id,
          compressedBlob: blob,
          compressedUrl,
          compressedSizeMb,
          savingsPercent,
        },
      }));

      setProgress(100);
      setStatusMessage({
        type: 'success',
        text: `Video compressed successfully! Size reduced to ${compressedSizeMb} MB (-${savingsPercent}%).`,
      });
    } catch (err: any) {
      console.error('Error compressing video:', err);
      setStatusMessage({
        type: 'error',
        text: `Compression failed: ${err.message || 'Browser memory or format error.'}`,
      });
    } finally {
      setCompressingId(null);
    }
  };

  const handleConfirmReplace = async () => {
    if (!confirmingReplace) return;
    const result = results[confirmingReplace.id];
    if (!result) return;

    setReplacing(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', result.compressedBlob, 'compressed.mp4');
      formData.append('templateId', confirmingReplace.slug || confirmingReplace.id);
      formData.append('videoPath', confirmingReplace.video_path || '');

      const res = await fetch('/api/admin/replace-video-preview', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to replace video asset');
      }

      setStatusMessage({
        type: 'success',
        text: `Successfully replaced ${confirmingReplace.name} preview video in Cloudflare R2!`,
      });

      // Refresh list & clear result
      setConfirmingReplace(null);
      fetchVideoTemplates();
    } catch (err: any) {
      console.error('Failed to replace video in Cloudflare R2:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to replace in Cloudflare R2: ${err.message}`,
      });
    } finally {
      setReplacing(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination Math
  const totalItems = filteredTemplates.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const paginatedTemplates = filteredTemplates.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 p-6 bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Video className="w-7 h-7 text-blue-600" />
            Video Preview Compressor
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Compress video template previews in your browser via FFmpeg WASM and replace assets in Cloudflare R2 storage.
          </p>
        </div>
        <button
          onClick={fetchVideoTemplates}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh List
        </button>
      </div>

      {/* Alert Status */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Search Bar & Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search video templates by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        <div className="text-xs font-semibold text-zinc-500">
          Total Videos: <span className="text-zinc-900 font-bold">{totalItems}</span>
        </div>
      </div>

      {/* Templates List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-zinc-200">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <span className="ml-3 text-sm text-zinc-600 font-medium">Loading video templates...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-zinc-200 text-zinc-500">
          No video templates found.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedTemplates.map((template) => {
              const rawUrl = template.video_path || '';
              const cdnUrl = convertR2UrlToCdn(rawUrl) || rawUrl;
              const isCompressing = compressingId === template.id;
              const result = results[template.id];

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-xl border border-zinc-200 p-5 shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-zinc-900 text-base">{template.name}</h3>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 shrink-0">
                        {template.originalSizeMb ? `${template.originalSizeMb} MB` : 'Checking MB...'}
                      </span>
                    </div>

                    {/* Original Video Preview */}
                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-zinc-200">
                      <video
                        src={cdnUrl}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Compression Progress & Output */}
                  {isCompressing && (
                    <div className="space-y-2 bg-blue-50 p-3.5 rounded-lg border border-blue-100">
                      <div className="flex justify-between text-xs font-semibold text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Compressing via FFmpeg WASM...
                        </span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Compression Result Card */}
                  {result && !isCompressing && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-900">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4 text-emerald-600" />
                          Compressed Preview Ready
                        </span>
                        <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                          -{result.savingsPercent}% saved
                        </span>
                      </div>
                      <div className="text-xs text-emerald-800">
                        Original: <span className="font-medium">{template.originalSizeMb || '?'} MB</span> → Compressed:{' '}
                        <span className="font-bold">{result.compressedSizeMb} MB</span>
                      </div>
                      <video
                        src={result.compressedUrl}
                        controls
                        className="w-full h-28 object-cover rounded border border-emerald-300"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => compressVideo(template)}
                      disabled={isCompressing || ffmpegLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      {isCompressing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Compressing...
                        </>
                      ) : (
                        <>
                          <Minimize2 className="w-4 h-4" />
                          Compress Video
                        </>
                      )}
                    </button>

                    {result && (
                      <button
                        onClick={() => setConfirmingReplace(template)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Replace in Cloudflare R2
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-sm mt-6">
              <div className="text-xs font-medium text-zinc-500">
                Showing <span className="font-bold text-zinc-900">{startIndex + 1}</span> to{' '}
                <span className="font-bold text-zinc-900">{endIndex}</span> of{' '}
                <span className="font-bold text-zinc-900">{totalItems}</span> videos
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validCurrentPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 text-xs font-semibold rounded-lg transition ${
                        validCurrentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validCurrentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-zinc-200 space-y-4">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirm Cloudflare R2 Replacement
            </h3>
            <p className="text-sm text-zinc-600">
              Are you sure you want to replace the preview video for{' '}
              <strong className="text-zinc-900">{confirmingReplace.name}</strong> in Cloudflare R2 object storage?
            </p>
            {results[confirmingReplace.id] && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs space-y-1">
                <div>Original Size: <strong>{confirmingReplace.originalSizeMb || '?'} MB</strong></div>
                <div>Compressed Size: <strong>{results[confirmingReplace.id].compressedSizeMb} MB</strong></div>
                <div>Reduction: <strong className="text-emerald-600">-{results[confirmingReplace.id].savingsPercent}%</strong></div>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmingReplace(null)}
                disabled={replacing}
                className="px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReplace}
                disabled={replacing}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-2"
              >
                {replacing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Replacing in R2...
                  </>
                ) : (
                  'Confirm & Replace File'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
