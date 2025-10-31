"use client";

import { useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type TemplateRow = { slug: string; name: string; price: number; img: string | null };

export default function ProductsPanel({ templates, onDelete, onCreated }: {
  templates: TemplateRow[];
  onDelete: (slug: string) => Promise<void> | void;
  onCreated: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    slug: '', name: '', subtitle: '', description: '', price: '', img: '', video: '', source_path: '', features: '', software: '', plugins: '', tags: '', is_featured: false,
    is_limited_offer: false, limited_offer_duration_days: '',
  });
  const [seo, setSeo] = useState<{ score: number; title: string; subtitle?: string; metaTitle?: string; metaDescription?: string; description: string; rationale: string; slug?: string; tags?: string[]; features?: string[] } | null>(null);
  const [checkingSeo, setCheckingSeo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);

  const uploadFile = async (kind: 'thumbnail' | 'video' | 'source', file: File) => {
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
      if (kind === 'thumbnail' && json.url) setForm((f) => ({ ...f, img: json.url }));
      if (kind === 'video' && json.url) setForm((f) => ({ ...f, video: json.url }));
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
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {templates.map((t) => (
            <li key={t.slug} className="rounded-2xl border border-white/10 bg-white/5 p-3 flex flex-col">
              <div className="h-28 w-full overflow-hidden rounded-xl mb-3">
                <img src={t.img || '/Logo.png'} alt={t.name} className="w-full h-full object-cover" />
              </div>
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
                        .select('slug,name,subtitle,description,price,img,video,source_path,features,software,plugins,tags,is_featured,is_limited_offer,limited_offer_duration_days,limited_offer_start_date')
                        .eq('slug', t.slug)
                        .maybeSingle();
                      if (!data) return;
                      setForm({
                        slug: data.slug || '',
                        name: data.name || '',
                        subtitle: data.subtitle || '',
                        description: data.description || '',
                        price: String(data.price ?? ''),
                        img: data.img || '',
                        video: data.video || '',
                        source_path: data.source_path || '',
                        features: Array.isArray(data.features) ? data.features.join(', ') : '',
                        software: Array.isArray(data.software) ? data.software.join(', ') : '',
                        plugins: Array.isArray(data.plugins) ? data.plugins.join(', ') : '',
                        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
                        is_featured: !!data.is_featured,
                        is_limited_offer: !!data.is_limited_offer,
                        limited_offer_duration_days: String(data.limited_offer_duration_days ?? ''),
                      });
                      setSeo(null);
                      setIsEditing(true);
                      setOriginalSlug(data.slug || null);
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
          ))}
        </ul>
      )}

      {tab === 'add' && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (creating) return;
            setCreating(true);
            try {
              // Automatically set start date to current date/time when limited offer is enabled
              const startDate = form.is_limited_offer ? new Date().toISOString() : null;
              
              const payload = {
                templates: [
                  {
                    slug: form.slug.trim(), name: form.name.trim(), subtitle: form.subtitle.trim(), description: form.description.trim(),
                    price: Number(form.price) || 0, img: form.img.trim() || null, video: form.video.trim() || null, source_path: form.source_path.trim() || null,
                    features: form.features ? form.features.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    software: form.software ? form.software.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    plugins: form.plugins ? form.plugins.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    tags: form.tags ? form.tags.split(',').map(s=>s.trim()).filter(Boolean) : [],
                    is_featured: !!form.is_featured,
                    is_limited_offer: !!form.is_limited_offer,
                    limited_offer_duration_days: form.is_limited_offer ? (Number(form.limited_offer_duration_days) || 0) : null,
                    limited_offer_start_date: startDate,
                  }
                ]
              };
              const res = await fetch('/api/admin/seed-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!res.ok) throw new Error('Create failed');
              await onCreated();
              setTab('list');
              setForm({ slug:'', name:'', subtitle:'', description:'', price:'', img:'', video:'', source_path:'', features:'', software:'', plugins:'', tags:'', is_featured:false, is_limited_offer: false, limited_offer_duration_days: '' });
              setIsEditing(false);
              setOriginalSlug(null);
            } catch {}
            finally { setCreating(false); }
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <input value={form.slug} onChange={(e)=>setForm({...form, slug:e.target.value})} placeholder="slug" required disabled={isEditing} className="px-3 py-2 rounded-lg bg-black/40 border border-white/10 disabled:opacity-60" />
          <input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="name" required className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
          <input value={form.subtitle} onChange={(e)=>setForm({...form, subtitle:e.target.value})} placeholder="subtitle" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
          <input value={form.price} onChange={(e)=>setForm({...form, price:e.target.value})} placeholder="price (INR)" type="number" min="0" step="0.01" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />

          <div className="flex items-center gap-2">
            <input value={form.img} onChange={(e)=>setForm({...form, img:e.target.value})} placeholder="image URL" className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
            <button type="button" onClick={() => thumbInputRef.current?.click()} className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10">Upload</button>
            <input ref={thumbInputRef} type="file" accept="image/*" hidden onChange={(e)=>{ const file=e.target.files?.[0]; if (file) uploadFile('thumbnail', file); }} />
          </div>
          <div className="flex items-center gap-2">
            <input value={form.video} onChange={(e)=>setForm({...form, video:e.target.value})} placeholder="video URL (optional)" className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
            <button type="button" onClick={() => videoInputRef.current?.click()} className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10">Upload</button>
            <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime" hidden onChange={(e)=>{ const file=e.target.files?.[0]; if (file) uploadFile('video', file); }} />
          </div>
          <div className="flex items-center gap-2">
            <input value={form.source_path} onChange={(e)=>setForm({...form, source_path:e.target.value})} placeholder="source path (private) e.g. Dude.rar" className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
            <button type="button" onClick={() => sourceInputRef.current?.click()} className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10">Upload</button>
            <input ref={sourceInputRef} type="file" accept="application/zip,application/x-rar-compressed,.zip,.rar" hidden onChange={(e)=>{ const file=e.target.files?.[0]; if (file) uploadFile('source', file); }} />
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.is_featured} onChange={(e)=>setForm({...form, is_featured:e.target.checked})} /> Featured</label>
          
          <div className="sm:col-span-2 rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_limited_offer} onChange={(e)=>setForm({...form, is_limited_offer:e.target.checked})} /> Limited Offer (Free for Subscribed Users)</label>
            {form.is_limited_offer && (
              <>
                <input value={form.limited_offer_duration_days} onChange={(e)=>setForm({...form, limited_offer_duration_days:e.target.value})} placeholder="Duration (days)" type="number" min="1" className="px-3 py-2 rounded-lg bg-black/40 border border-white/10" />
                <p className="text-xs text-green-300">During the limited time period, subscribed users can get this product for FREE. The offer will start immediately and last for the specified number of days. After the duration expires, the price will revert to the original price (₹{form.price || '0'}).</p>
              </>
            )}
          </div>

          <div className="sm:col-span-2 flex gap-3">
            <button disabled={creating} className="rounded-full bg-white text-black px-5 py-2 text-sm font-semibold hover:bg-zinc-200">{creating ? (isEditing ? 'Saving…' : 'Creating…') : (isEditing ? 'Save Changes' : 'Create Product')}</button>
            <button type="button" onClick={()=>{ setTab('list'); setIsEditing(false); setOriginalSlug(null); }} className="rounded-full border border-white/30 px-5 py-2 text-sm hover:bg-white/10">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}


