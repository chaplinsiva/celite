"use client";

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import YouTubeVideoPlayer from '../../../components/YouTubeVideoPlayer';

type TemplateRow = { slug: string; name: string; img: string | null; video?: string | null };

const extractYouTubeId = (url: string) => {
  try {
    if (!url) return null;
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
      if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1];
      const shortsMatch = parsed.pathname.match(/\/shorts\/([^/]+)/);
      if (shortsMatch) return shortsMatch[1];
    }
    if (parsed.hostname === 'youtu.be') {
      return parsed.pathname.slice(1);
    }
  } catch { }
  return null;
};

const getYouTubeEmbedUrl = (url: string) => {
  const id = extractYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
};

export default function ProductsPanel({ templates, onDelete, onCreated }: {
  templates: TemplateRow[];
  onDelete: (slug: string) => Promise<void> | void;
  onCreated: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    slug: '', name: '', subtitle: '', description: '', img: '', video: '', source_path: '', features: '', software: '', plugins: '', tags: '', category_id: '', subcategory_id: '', meta_title: '', meta_description: '',
  });
  const [previews, setPreviews] = useState<Array<{ id?: string; kind: 'image' | 'video' | 'youtube'; title?: string; url: string; sort_order?: number }>>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [seo, setSeo] = useState<{ score: number; title: string; subtitle?: string; metaTitle?: string; metaDescription?: string; description: string; rationale: string; slug?: string; tags?: string[]; features?: string[] } | null>(null);
  const [checkingSeo, setCheckingSeo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const videoPreviewUrl = getYouTubeEmbedUrl(form.video);

  // Function to generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Auto-generate slug from name when name changes (only for new entries or if slug hasn't been manually edited)
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: !isEditing && !slugManuallyEdited ? generateSlug(name) : f.slug,
    }));
  };

  // Handle manual slug editing
  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    setForm((f) => ({ ...f, slug }));
  };

  useEffect(() => {
    const loadCategories = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const [catsRes, subsRes] = await Promise.all([
          fetch('/api/admin/categories', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/admin/subcategories', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const catsJson = await catsRes.json();
        const subsJson = await subsRes.json();

        if (catsJson.ok) {
          setCategories((catsJson.categories || []).map((cat: any) => ({ id: cat.id, name: cat.name, slug: cat.slug })));
        }
        if (subsJson.ok) {
          const subs = (subsJson.subcategories || []).map((sub: any) => ({ id: sub.id, category_id: sub.category_id, name: sub.name, slug: sub.slug }));
          setSubcategories(subs);
          setFilteredSubcategories(subs);
        }
      } catch (e) {
        console.error('Failed to load categories/subcategories:', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (form.category_id) {
      setFilteredSubcategories(subcategories.filter(s => s.category_id === form.category_id));
      if (form.subcategory_id && !subcategories.find(s => s.id === form.subcategory_id && s.category_id === form.category_id)) {
        setForm(f => ({ ...f, subcategory_id: '' }));
      }
    } else {
      setFilteredSubcategories([]);
      setForm(f => ({ ...f, subcategory_id: '' }));
    }
  }, [form.category_id, subcategories]);

  const uploadFile = async (kind: 'source' | 'thumbnail' | 'video', file: File, extra?: { previewIndex?: number }) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    if (form.slug) fd.append('slug', form.slug);
    if (form.category_id) fd.append('category_id', form.category_id);
    if (form.subcategory_id) fd.append('subcategory_id', form.subcategory_id);
    const res = await fetch('/api/admin/upload-file', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd });
    const json = await res.json();
    if (json.ok) {
      if (kind === 'source' && json.path) {
        setForm((f) => ({ ...f, source_path: json.path }));
      }
      if ((kind === 'thumbnail' || kind === 'video') && json.path && extra?.previewIndex != null) {
        setPreviews(prev =>
          prev.map((p, idx) =>
            idx === extra.previewIndex ? { ...p, url: json.path } : p
          ),
        );
      }
    }
  };

  // Helper to load previews when editing
  const loadPreviews = async (slug: string) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/admin/template-previews?template_slug=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok && Array.isArray(json.previews)) {
        setPreviews(json.previews);
      } else {
        setPreviews([]);
      }
    } catch {
      setPreviews([]);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">Products</h2>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs font-medium">
          <button
            onClick={() => setTab('list')}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'list' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Product List
          </button>
          <button
            onClick={() => setTab('add')}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'add' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Add New Product
          </button>
        </div>
      </header>

      {tab === 'list' && (
        <>
          <div className="mb-6">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or slug"
              className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(templates || [])
              .filter((t) => {
                const q = searchTerm.trim().toLowerCase();
                if (!q) return true;
                return (t.name || '').toLowerCase().includes(q) || (t.slug || '').toLowerCase().includes(q);
              })
              .map((t) => {
                const youtubeId = extractYouTubeId(t.video || '');
                const thumbnail = t.img || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null);
                return (
                  <li key={t.slug} className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    {t.video ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 border border-zinc-100">
                        <YouTubeVideoPlayer
                          videoUrl={t.video || ''}
                          title={t.name}
                          className="w-full h-full"
                        />
                      </div>
                    ) : thumbnail ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 border border-zinc-100">
                        <img src={thumbnail} alt={t.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 flex items-center justify-center border border-zinc-200">
                        <span className="text-xs text-zinc-400 font-medium">No Thumbnail</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 truncate" title={t.name}>{t.name}</h3>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{t.slug}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const supabase = getSupabaseBrowserClient();
                            const { data } = await supabase
                              .from('templates')
                              .select('slug,name,subtitle,description,img,video,source_path,features,software,plugins,tags,category_id,subcategory_id,meta_title,meta_description')
                              .eq('slug', t.slug)
                              .maybeSingle();
                            if (!data) return;
                            setForm({
                              slug: data.slug || '',
                              name: data.name || '',
                              subtitle: data.subtitle || '',
                              description: data.description || '',
                              img: data.img || '',
                              video: data.video || '',
                              source_path: data.source_path || '',
                              features: Array.isArray(data.features) ? data.features.join(', ') : '',
                              software: Array.isArray(data.software) ? data.software.join(', ') : '',
                              plugins: Array.isArray(data.plugins) ? data.plugins.join(', ') : '',
                              tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
                              category_id: data.category_id || '',
                              subcategory_id: data.subcategory_id || '',
                              meta_title: data.meta_title || '',
                              meta_description: data.meta_description || '',
                            });
                            await loadPreviews(data.slug);
                            setSeo(null);
                            setIsEditing(true);
                            setOriginalSlug(data.slug || null);
                            setSlugManuallyEdited(false);
                            setTab('add');
                          } catch { }
                        }}
                        className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
                      >
                        Edit
                      </button>
                      <button onClick={() => onDelete(t.slug)} className="rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-xs font-medium hover:bg-red-100 transition-colors">Delete</button>
                    </div>
                  </li>
                );
              })}
          </ul>
        </>
      )}

      {tab === 'add' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating) return;
            setCreating(true);
            try {
              const payload = {
                templates: [
                  {
                    slug: form.slug.trim(), name: form.name.trim(), subtitle: form.subtitle.trim(), description: form.description.trim(),
                    img: null, video: form.video.trim() || null, source_path: form.source_path.trim() || null,
                    features: form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [],
                    software: form.software ? form.software.split(',').map(s => s.trim()).filter(Boolean) : [],
                    plugins: form.plugins ? form.plugins.split(',').map(s => s.trim()).filter(Boolean) : [],
                    tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
                    category_id: form.category_id || null,
                    subcategory_id: form.subcategory_id || null,
                    meta_title: form.meta_title.trim() || null,
                    meta_description: form.meta_description.trim() || null,
                  }
                ]
              };
              const res = await fetch('/api/admin/seed-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!res.ok) throw new Error('Create failed');
              const supabase = getSupabaseBrowserClient();
              const { data: { session } } = await supabase.auth.getSession();
              // Save previews for this template
              if (session && form.slug) {
                const baseSlug = form.slug.trim();
                const existingRes = await fetch(`/api/admin/template-previews?template_slug=${encodeURIComponent(baseSlug)}`, {
                  headers: { Authorization: `Bearer ${session.access_token}` },
                });
                const existingJson = await existingRes.json();
                const existingIds: string[] = (existingJson.ok && Array.isArray(existingJson.previews))
                  ? existingJson.previews.map((p: any) => p.id)
                  : [];

                // Delete removed previews
                for (const id of existingIds) {
                  if (!previews.find(p => p.id === id)) {
                    await fetch(`/api/admin/template-previews?id=${encodeURIComponent(id)}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${session.access_token}` },
                    });
                  }
                }

                // Upsert current previews
                for (let i = 0; i < previews.length; i++) {
                  const p = previews[i];
                  if (!p.url) continue;
                  await fetch('/api/admin/template-previews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                    body: JSON.stringify({
                      id: p.id,
                      template_slug: baseSlug,
                      kind: p.kind,
                      title: p.title,
                      url: p.url,
                      sort_order: i,
                    }),
                  });
                }
              }
              await onCreated();
              setTab('list');
              setForm({ slug: '', name: '', subtitle: '', description: '', img: '', video: '', source_path: '', features: '', software: '', plugins: '', tags: '', category_id: '', subcategory_id: '', meta_title: '', meta_description: '' });
              setPreviews([]);
              setIsEditing(false);
              setOriginalSlug(null);
              setSlugManuallyEdited(false);
            } catch { }
            finally { setCreating(false); }
          }}
          className="grid gap-6 sm:grid-cols-2 max-w-4xl"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Name (Title) *</label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Template Name"
              required
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Slug *</label>
            <div className="flex items-center gap-2">
              <input
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="slug-auto-generated"
                required
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm disabled:bg-zinc-50 disabled:text-zinc-500 cursor-text disabled:cursor-not-allowed"
              />
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugManuallyEdited(false);
                    setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap"
                  title="Regenerate slug from name"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Subtitle</label>
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Brief subtitle"
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Subcategory</label>
            <select
              value={form.subcategory_id}
              onChange={(e) => setForm({ ...form, subcategory_id: e.target.value })}
              disabled={!form.category_id}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">Select Subcategory</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">YouTube Preview (Optional)</label>
            <div className="flex items-center gap-2">
              <input
                value={form.video}
                onChange={(e) => setForm({ ...form, video: e.target.value })}
                placeholder="YouTube Video Link (e.g., https://www.youtube.com/watch?v=VIDEO_ID)"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
            {videoPreviewUrl && (
              <div className="aspect-video w-full max-w-md self-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm relative z-0">
                <iframe
                  src={videoPreviewUrl}
                  title={form.name || 'YouTube preview'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
            <p className="text-xs text-zinc-500">
              Optional YouTube preview. The main preview on the product page will use the first item in the Additional Previews gallery below.
            </p>
          </div>

          {/* Additional Previews */}
          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Additional Previews</label>
            <p className="text-xs text-zinc-500 mb-1">
              Add extra thumbnails or videos (either YouTube links or uploaded files). These will show as a preview gallery on the product page.
            </p>
            <div className="space-y-3">
              {previews.map((p, idx) => {
                const isYoutube = p.kind === 'youtube';
                return (
                  <div key={p.id || idx} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={p.kind}
                        onChange={(e) => {
                          const kind = e.target.value as 'image' | 'video' | 'youtube';
                          setPreviews(prev => prev.map((row, i) => i === idx ? { ...row, kind } : row));
                        }}
                        className="px-3 py-1 text-xs rounded-md border border-zinc-200 bg-zinc-50"
                      >
                        <option value="image">Image (thumbnail)</option>
                        <option value="video">Video file</option>
                        <option value="youtube">YouTube link</option>
                      </select>
                      <input
                        value={p.title || ''}
                        onChange={(e) =>
                          setPreviews(prev => prev.map((row, i) => i === idx ? { ...row, title: e.target.value } : row))
                        }
                        placeholder="Optional title"
                        className="flex-1 min-w-[120px] px-3 py-1 rounded-md border border-zinc-200 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setPreviews(prev => prev.filter((_, i) => i !== idx))}
                        className="px-2 py-1 text-xs rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={p.url}
                        onChange={(e) =>
                          setPreviews(prev => prev.map((row, i) => i === idx ? { ...row, url: e.target.value } : row))
                        }
                        placeholder={
                          isYoutube
                            ? 'YouTube link'
                            : 'Direct URL or will be filled when you upload a file'
                        }
                        className="flex-1 px-3 py-2 rounded-md border border-zinc-200 text-xs"
                      />
                      {!isYoutube && (
                        <button
                          type="button"
                          onClick={() => {
                            const ref = p.kind === 'image' ? thumbInputRef : videoInputRef;
                            if (ref.current) {
                              (ref.current as any).dataset.index = String(idx);
                              ref.current.click();
                            }
                          }}
                          className="px-3 py-2 text-xs rounded-md border border-zinc-200 bg-white hover:bg-zinc-50"
                        >
                          Upload
                        </button>
                      )}
                    </div>
                    {isYoutube && p.url && getYouTubeEmbedUrl(p.url) && (
                      <div className="aspect-video w-full max-w-md overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 shadow-sm">
                        <iframe
                          src={getYouTubeEmbedUrl(p.url) || ''}
                          title={p.title || form.name || 'Preview'}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          className="h-full w-full"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  setPreviews(prev => [...prev, { kind: 'image', url: '' }])
                }
                className="px-3 py-2 text-xs rounded-md border border-dashed border-zinc-300 text-zinc-600 hover:bg-zinc-50"
              >
                + Add Preview
              </button>
            </div>
            {/* Hidden file inputs for previews */}
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                const idxStr = (thumbInputRef.current as any)?.dataset.index;
                const index = idxStr ? parseInt(idxStr, 10) : -1;
                if (file && index >= 0) {
                  uploadFile('thumbnail', file, { previewIndex: index });
                }
                if (thumbInputRef.current) {
                  thumbInputRef.current.value = '';
                }
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                const idxStr = (videoInputRef.current as any)?.dataset.index;
                const index = idxStr ? parseInt(idxStr, 10) : -1;
                if (file && index >= 0) {
                  uploadFile('video', file, { previewIndex: index });
                }
                if (videoInputRef.current) {
                  videoInputRef.current.value = '';
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Source File (Private)</label>
            <div className="flex items-center gap-2">
              <input
                value={form.source_path}
                onChange={(e) => setForm({ ...form, source_path: e.target.value })}
                placeholder="Upload file (stored in R2) or paste a direct download URL"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => sourceInputRef.current?.click()}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap"
              >
                Upload File
              </button>
              <input ref={sourceInputRef} type="file" accept="application/zip,application/x-rar-compressed,.zip,.rar" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('source', file); }} />
            </div>
            <p className="text-xs text-zinc-500">You can either upload a zip/rar file (saved in Cloudflare R2) or paste a direct download link.</p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Product description..."
              rows={4}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Meta Title (SEO)</label>
            <input
              value={form.meta_title}
              onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              placeholder="SEO Title"
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Meta Description (SEO)</label>
            <textarea
              value={form.meta_description}
              onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              placeholder="SEO Description"
              rows={2}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>

          <div className="sm:col-span-2 bg-zinc-50 rounded-xl p-4 border border-zinc-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-900">SEO Helper</h3>
              <button
                type="button"
                disabled={checkingSeo}
                onClick={async () => {
                  try {
                    setCheckingSeo(true);
                    const supabase = getSupabaseBrowserClient();
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;
                    const payload = {
                      name: form.name,
                      subtitle: form.subtitle,
                      description: form.description,
                      slug: form.slug,
                      tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
                      features: form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [],
                    };
                    const res = await fetch('/api/admin/seo/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(payload) });
                    const json = await res.json();
                    if (res.ok && json.ok) setSeo(json.result);
                  } finally { setCheckingSeo(false); }
                }}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition-colors shadow-sm font-medium"
              >
                {checkingSeo ? 'Checking...' : 'Check SEO Analysis'}
              </button>
            </div>

            {seo && (
              <div className="text-xs text-zinc-600 space-y-2">
                <div>SEO Score: <span className={`font-bold ${seo.score >= 80 ? 'text-green-600' : seo.score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{seo.score}</span></div>
                <div>Rationale: <span className="text-zinc-500 italic">{seo.rationale}</span></div>

                <div className="grid gap-2 mt-4 pt-4 border-t border-zinc-200">
                  <div className="font-semibold text-zinc-900">Suggestions:</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>Title: <span className="text-zinc-800">{seo.title}</span></div>
                    <div>Meta Title: <span className="text-zinc-800">{seo.metaTitle || seo.title}</span></div>
                    <div>Subtitle: <span className="text-zinc-800">{seo.subtitle}</span></div>
                    <div>Meta Desc: <span className="text-zinc-800">{seo.metaDescription || seo.description}</span></div>
                    <div>Slug: <span className="text-zinc-800">{seo.slug}</span></div>
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(f => ({
                        ...f,
                        /* keep original name & slug to preserve template identity unless needed */
                        // Actually let's just keep name/slug manual per old logic, but apply others
                        name: f.name,
                        slug: f.slug,
                        subtitle: seo.subtitle || f.subtitle,
                        description: seo.metaDescription || seo.description,
                        tags: Array.isArray(seo?.tags) ? seo?.tags.join(', ') : f.tags,
                        features: Array.isArray(seo?.features) ? seo?.features.join(', ') : f.features
                      }));
                    }}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
                  >
                    Apply Suggestions
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Features (comma separated)</label>
            <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="e.g. 4K Resolution, No Plugins Required" className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Software (comma separated)</label>
            <input value={form.software} onChange={(e) => setForm({ ...form, software: e.target.value })} placeholder="e.g. After Effects 2024" className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Plugins (comma separated)</label>
            <input value={form.plugins} onChange={(e) => setForm({ ...form, plugins: e.target.value })} placeholder="e.g. Element 3D, Optical Flares" className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. intro, logo reveal, corporate" className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm" />
          </div>

          <div className="sm:col-span-2 flex gap-4 mt-4 pt-4 border-t border-zinc-200">
            <button disabled={creating} className="rounded-lg bg-blue-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all">{creating ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Product')}</button>
            <button type="button" onClick={() => { setTab('list'); setIsEditing(false); setOriginalSlug(null); setSlugManuallyEdited(false); }} className="rounded-lg border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}


