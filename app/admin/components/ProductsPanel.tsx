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
  } catch {}
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
    slug: '', name: '', subtitle: '', description: '', img: '', video: '', source_path: '', features: '', software: '', plugins: '', tags: '', category_id: '', subcategory_id: '',
  });
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [seo, setSeo] = useState<{ score: number; title: string; subtitle?: string; metaTitle?: string; metaDescription?: string; description: string; rationale: string; slug?: string; tags?: string[]; features?: string[] } | null>(null);
  const [checkingSeo, setCheckingSeo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement | null>(null);
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

  const uploadFile = async (kind: 'source', file: File) => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    if (form.slug) fd.append('slug', form.slug);
    const res = await fetch('/api/admin/upload-file', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd });
    const json = await res.json();
    if (json.ok) {
      if (kind === 'source' && json.path) setForm((f) => ({ ...f, source_path: json.path }));
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Products</h2>
        <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
          <button onClick={() => setTab('list')} className={`px-3 py-1 rounded-full ${tab==='list'?'bg-white text-black':'text-white/80'}`}>Product List</button>
          <button onClick={() => setTab('add')} className={`px-3 py-1 rounded-full ${tab==='add'?'bg-white text-black':'text-white/80'}`}>Add New Product</button>
        </div>
      </header>

      {tab === 'list' && (
        <>
        <div className="mb-4">
          <input
            value={searchTerm}
            onChange={(e)=>setSearchTerm(e.target.value)}
            placeholder="Search by name or slug"
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
          />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
              <li key={t.slug} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col">
                {t.video ? (
                  <div className="h-28 w-full overflow-hidden rounded-xl mb-3 bg-zinc-900">
                    <YouTubeVideoPlayer 
                      videoUrl={t.video || ''}
                      title={t.name}
                      className="w-full h-full"
                    />
                  </div>
                ) : thumbnail ? (
                  <div className="h-28 w-full overflow-hidden rounded-xl mb-3 bg-zinc-900">
                    <img src={thumbnail} alt={t.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-28 w-full overflow-hidden rounded-xl mb-3 bg-zinc-800 flex items-center justify-center">
                    <span className="text-xs text-zinc-500">No Thumbnail</span>
                  </div>
                )}
              <div className="flex-1">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-zinc-400">{t.slug}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const supabase = getSupabaseBrowserClient();
                      const { data } = await supabase
                        .from('templates')
                        .select('slug,name,subtitle,description,img,video,source_path,features,software,plugins,tags,category_id,subcategory_id')
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
                      });
                      setSeo(null);
                      setIsEditing(true);
                      setOriginalSlug(data.slug || null);
                      setSlugManuallyEdited(false);
                      setTab('add');
                    } catch {}
                  }}
                  className="rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10"
                >
                  Edit
                </button>
                <button onClick={() => onDelete(t.slug)} className="rounded-full border border-red-400 text-red-200 px-3 py-1 text-xs hover:bg-red-500/10">Delete</button>
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
                    features: form.features ? form.features.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    software: form.software ? form.software.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    plugins: form.plugins ? form.plugins.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    tags: form.tags ? form.tags.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    category_id: form.category_id || null,
                    subcategory_id: form.subcategory_id || null,
                  }
                ]
              };
              const res = await fetch('/api/admin/seed-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!res.ok) throw new Error('Create failed');
              await onCreated();
              setTab('list');
              setForm({ slug:'', name:'', subtitle:'', description:'', img:'', video:'', source_path:'', features:'', software:'', plugins:'', tags:'', category_id: '', subcategory_id: '' });
              setIsEditing(false);
              setOriginalSlug(null);
              setSlugManuallyEdited(false);
            } catch {}
            finally { setCreating(false); }
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input value={form.name} onChange={(e)=>handleNameChange(e.target.value)} placeholder="name (title)" required className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
          <div className="flex items-center gap-2">
            <input 
              value={form.slug} 
              onChange={(e)=>handleSlugChange(e.target.value)} 
              placeholder="slug (auto-generated)" 
              required 
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed" 
            />
            {!isEditing && (
              <button
                type="button"
                onClick={() => {
                  setSlugManuallyEdited(false);
                  setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
                }}
                className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10 whitespace-nowrap"
                title="Regenerate slug from name"
              >
                Auto
              </button>
            )}
          </div>
          <input value={form.subtitle} onChange={(e)=>setForm({...form, subtitle:e.target.value})} placeholder="subtitle" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
          <select value={form.category_id} onChange={(e)=>setForm({...form, category_id:e.target.value})} className="px-3 py-2 rounded-lg bg-black/40 border border-white/10">
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select value={form.subcategory_id} onChange={(e)=>setForm({...form, subcategory_id:e.target.value})} disabled={!form.category_id} className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 disabled:opacity-60">
            <option value="">Select Subcategory</option>
            {filteredSubcategories.map((sub) => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>

          <div className="flex flex-col gap-3 sm:col-span-2">
            <div className="flex items-center gap-2">
              <input value={form.video} onChange={(e)=>setForm({...form, video:e.target.value})} placeholder="YouTube Video Link (e.g., https://www.youtube.com/watch?v=VIDEO_ID)" className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
            </div>
            {videoPreviewUrl && (
              <div className="aspect-video w-full max-w-md self-center overflow-hidden rounded-xl border border-white/10">
                <iframe
                  src={videoPreviewUrl}
                  title={form.name || 'YouTube preview'}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-500 sm:col-span-2">Enter a YouTube video URL. The video will be embedded as a preview. Image uploads are no longer supported.</p>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs text-zinc-400">Source File (Private)</label>
            <div className="flex items-center gap-2">
              <input 
                value={form.source_path} 
                onChange={(e)=>setForm({...form, source_path:e.target.value})} 
                placeholder="Upload file or paste direct drive link (Google Drive, Dropbox, etc.)" 
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10" 
              />
              <button 
                type="button" 
                onClick={() => sourceInputRef.current?.click()} 
                className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10 whitespace-nowrap"
              >
                Upload File
              </button>
              <input ref={sourceInputRef} type="file" accept="application/zip,application/x-rar-compressed,.zip,.rar" hidden onChange={(e)=>{ const file=e.target.files?.[0]; if (file) uploadFile('source', file); }} />
            </div>
            <p className="text-xs text-zinc-500">You can either upload a zip/rar file or paste a direct download link (Google Drive shareable link, Dropbox link, etc.)</p>
          </div>

          <textarea value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="description" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 sm:col-span-2" />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button type="button" disabled={checkingSeo} onClick={async ()=>{
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
                  tags: form.tags ? form.tags.split(',').map(s=>s.trim()).filter(Boolean) : [],
                  features: form.features ? form.features.split(',').map(s=>s.trim()).filter(Boolean) : [],
                };
                const res = await fetch('/api/admin/seo/analyze', { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(payload) });
                const json = await res.json();
                if (res.ok && json.ok) setSeo(json.result);
              } finally { setCheckingSeo(false); }
            }} className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10">{checkingSeo ? 'Checking…' : 'Check SEO'}</button>
            {seo && (
              <div className="text-xs text-zinc-300">
                <div>SEO Score: <span className="font-semibold text-white">{seo.score}</span></div>
                <div className="mt-1">Suggest Title: <span className="text-white">{seo.title}</span></div>
                {seo.subtitle && <div className="mt-1">Suggest Subtitle: <span className="text-white">{seo.subtitle}</span></div>}
                <div className="mt-1">Suggest Meta Title: <span className="text-white">{seo.metaTitle || seo.title}</span></div>
                <div className="mt-1">Suggest Meta Description: <span className="text-white">{seo.metaDescription || seo.description}</span></div>
                <div className="mt-1">Suggest Slug: <span className="text-white">{seo.slug}</span></div>
                {Array.isArray(seo.tags) && seo.tags.length > 0 && (
                  <div className="mt-1">Suggest Tags: <span className="text-white">{seo.tags.join(', ')}</span></div>
                )}
                {Array.isArray(seo.features) && seo.features.length > 0 && (
                  <div className="mt-1">Suggest Features: <span className="text-white">{seo.features.join(', ')}</span></div>
                )}
                <div className="mt-1 text-zinc-400">{seo.rationale}</div>
              </div>
            )}
            {seo && (
              <button type="button" onClick={()=>{ setForm(f=>({ ...f, /* keep original name & slug to preserve template identity */ name: f.name, slug: f.slug, subtitle: seo.subtitle || f.subtitle, description: seo.metaDescription || seo.description, tags: Array.isArray(seo.tags)? seo.tags.join(', '): f.tags, features: Array.isArray(seo.features)? seo.features.join(', '): f.features })); }} className="ml-auto rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200">Apply Suggestion</button>
            )}
          </div>
          <input value={form.features} onChange={(e)=>setForm({...form, features:e.target.value})} placeholder="features (comma separated)" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 sm:col-span-2" />
          <input value={form.software} onChange={(e)=>setForm({...form, software:e.target.value})} placeholder="software (comma separated)" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 sm:col-span-2" />
          <input value={form.plugins} onChange={(e)=>setForm({...form, plugins:e.target.value})} placeholder="plugins (comma separated)" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 sm:col-span-2" />
          <input value={form.tags} onChange={(e)=>setForm({...form, tags:e.target.value})} placeholder="tags (comma separated)" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 sm:col-span-2" />

          <div className="sm:col-span-2 flex gap-3">
            <button disabled={creating} className="rounded-full bg-white text-black px-5 py-2 text-sm font-semibold hover:bg-zinc-200">{creating ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Changes' : 'Create Product')}</button>
            <button type="button" onClick={()=>{ setTab('list'); setIsEditing(false); setOriginalSlug(null); setSlugManuallyEdited(false); }} className="rounded-full border border-white/30 px-5 py-2 text-sm hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}


