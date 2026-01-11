"use client";

import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import VideoThumbnailPlayer from '../../../components/VideoThumbnailPlayer';

type TemplateRow = { slug: string; name: string; img: string | null; video_path?: string | null; thumbnail_path?: string | null; vendor_name?: string | null; creator_shop_id?: string | null; status?: string | null };

export default function ProductsPanel({ templates, onDelete, onCreated }: {
  templates: TemplateRow[];
  onDelete: (slug: string) => Promise<void> | void;
  onCreated: () => Promise<void> | void;
}) {
  const [tab, setTab] = useState<'list' | 'add'>('list');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    slug: '', name: '', subtitle: '', description: '', img: '', video_path: '', thumbnail_path: '', audio_preview_path: '', model_3d_path: '', source_path: '', features: '', software: '', plugins: '', tags: '', category_id: '', subcategory_id: '', sub_subcategory_id: '', meta_title: '', meta_description: '',
  });
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Array<{ id: string; category_id: string; name: string; slug: string }>>([]);
  const [subSubcategories, setSubSubcategories] = useState<Array<{ id: string; subcategory_id: string; name: string; slug: string }>>([]);
  const [filteredSubSubcategories, setFilteredSubSubcategories] = useState<Array<{ id: string; subcategory_id: string; name: string; slug: string }>>([]);
  const [seo, setSeo] = useState<{ score: number; title: string; subtitle?: string; metaTitle?: string; metaDescription?: string; description: string; rationale: string; slug?: string; tags?: string[]; features?: string[] } | null>(null);
  const [checkingSeo, setCheckingSeo] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalSlug, setOriginalSlug] = useState<string | null>(null);

  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const audioPreviewInputRef = useRef<HTMLInputElement | null>(null);
  const model3DInputRef = useRef<HTMLInputElement | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [uploadingSource, setUploadingSource] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingAudioPreview, setUploadingAudioPreview] = useState(false);
  const [uploadingModel3D, setUploadingModel3D] = useState(false);


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
        const [catsRes, subsRes, subSubsRes] = await Promise.all([
          fetch('/api/admin/categories', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/admin/subcategories', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
          fetch('/api/admin/sub-subcategories', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }),
        ]);

        const catsJson = await catsRes.json();
        const subsJson = await subsRes.json();
        const subSubsJson = await subSubsRes.json();

        if (catsJson.ok) {
          setCategories((catsJson.categories || []).map((cat: any) => ({ id: cat.id, name: cat.name, slug: cat.slug })));
        }
        if (subsJson.ok) {
          const subs = (subsJson.subcategories || []).map((sub: any) => ({ id: sub.id, category_id: sub.category_id, name: sub.name, slug: sub.slug }));
          setSubcategories(subs);
          setFilteredSubcategories(subs);
        }
        if (subSubsJson.ok) {
          const subSubs = (subSubsJson.sub_subcategories || []).map((subSub: any) => ({ id: subSub.id, subcategory_id: subSub.subcategory_id, name: subSub.name, slug: subSub.slug }));
          setSubSubcategories(subSubs);
          setFilteredSubSubcategories(subSubs);
        }
      } catch (e) {
        console.error('Failed to load categories/subcategories/sub-subcategories:', e);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (form.category_id) {
      setFilteredSubcategories(subcategories.filter(s => s.category_id === form.category_id));
      if (form.subcategory_id && !subcategories.find(s => s.id === form.subcategory_id && s.category_id === form.category_id)) {
        setForm(f => ({ ...f, subcategory_id: '', sub_subcategory_id: '' }));
      }
    } else {
      setFilteredSubcategories([]);
      setForm(f => ({ ...f, subcategory_id: '', sub_subcategory_id: '' }));
    }
  }, [form.category_id, subcategories]);

  useEffect(() => {
    if (form.subcategory_id) {
      setFilteredSubSubcategories(subSubcategories.filter(s => s.subcategory_id === form.subcategory_id));
      if (form.sub_subcategory_id && !subSubcategories.find(s => s.id === form.sub_subcategory_id && s.subcategory_id === form.subcategory_id)) {
        setForm(f => ({ ...f, sub_subcategory_id: '' }));
      }
    } else {
      setFilteredSubSubcategories([]);
      setForm(f => ({ ...f, sub_subcategory_id: '' }));
    }
  }, [form.subcategory_id, subSubcategories]);

  const uploadFile = async (kind: 'source' | 'video' | 'thumbnail' | 'audio_preview' | 'model_3d', file: File) => {
    if (!form.category_id) {
      alert('Please select a category first');
      return;
    }
    
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    if (kind === 'source') setUploadingSource(true);
    else if (kind === 'video') setUploadingVideo(true);
    else if (kind === 'thumbnail') setUploadingThumbnail(true);
    else if (kind === 'audio_preview') setUploadingAudioPreview(true);
    else if (kind === 'model_3d') setUploadingModel3D(true);
    
    try {
      let fileToUpload = file;
      
      // Compress thumbnail images before uploading
      if (kind === 'thumbnail' && file.type.startsWith('image/')) {
        try {
          const { compressThumbnail } = await import('../../../lib/imageCompression');
          fileToUpload = await compressThumbnail(file);
        } catch (compressionError) {
          console.warn('Image compression failed, uploading original:', compressionError);
          // Continue with original file if compression fails
        }
      }
      
    const fd = new FormData();
      fd.append('file', fileToUpload);
    fd.append('kind', kind);
      fd.append('category_id', form.category_id);
      if (form.subcategory_id) fd.append('subcategory_id', form.subcategory_id);
      if (form.sub_subcategory_id) fd.append('sub_subcategory_id', form.sub_subcategory_id);
    if (form.slug) fd.append('slug', form.slug);
    if (form.name) fd.append('template_name', form.name); // Required for folder structure
      
      const res = await fetch('/api/admin/upload-r2', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${session.access_token}` }, 
        body: fd 
      });
    const json = await res.json();
    if (json.ok) {
        // For source files, json.url is the key (stored in source_path)
        // For preview files, json.url is the public URL
        if (kind === 'source' && json.key) {
          setForm((f) => ({ ...f, source_path: json.key })); // Store key for source files
        } else if (kind === 'video' && json.url) {
          setForm((f) => ({ ...f, video_path: json.url })); // Store public URL for previews
        } else if (kind === 'thumbnail' && json.url) {
          setForm((f) => ({ ...f, thumbnail_path: json.url }));
        } else if (kind === 'audio_preview' && json.url) {
          setForm((f) => ({ ...f, audio_preview_path: json.url }));
        } else if (kind === 'model_3d' && json.url) {
          setForm((f) => ({ ...f, model_3d_path: json.url }));
        }
      } else {
        alert(json.error || 'Upload failed');
      }
    } catch (e: any) {
      alert(e?.message || 'Upload failed');
    } finally {
      if (kind === 'source') setUploadingSource(false);
      else if (kind === 'video') setUploadingVideo(false);
      else if (kind === 'thumbnail') setUploadingThumbnail(false);
      else if (kind === 'audio_preview') setUploadingAudioPreview(false);
      else if (kind === 'model_3d') setUploadingModel3D(false);
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
                const thumbnail = t.thumbnail_path || t.img || null;
                const isVendorTemplate = !!t.creator_shop_id || !!t.vendor_name;
                const status = t.status || 'approved';
                const statusLabel =
                  status === 'pending'
                    ? 'Pending review'
                    : status === 'rejected'
                      ? 'Rejected'
                      : 'Approved';
                const statusClass =
                  status === 'pending'
                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                    : status === 'rejected'
                      ? 'bg-red-50 text-red-700 border-red-100'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                const vendor = t.vendor_name || 'Celite Studios';

                return (
                  <li key={t.slug} className="rounded-2xl border border-zinc-200 bg-white p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    {t.video_path ? (
                      <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 bg-zinc-100 border border-zinc-100">
                        <VideoThumbnailPlayer
                          videoUrl={t.video_path}
                          thumbnailUrl={thumbnail || undefined}
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
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Vendor: <span className="font-medium text-zinc-700">{vendor}</span>
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      {isVendorTemplate && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusClass}`}>
                          {statusLabel}
                        </span>
                      )}
                      <button
                        onClick={async () => {
                          try {
                            const supabase = getSupabaseBrowserClient();
                            const { data } = await supabase
                              .from('templates')
                              .select('slug,name,subtitle,description,img,video_path,thumbnail_path,audio_preview_path,model_3d_path,source_path,features,software,plugins,tags,category_id,subcategory_id,sub_subcategory_id,meta_title,meta_description')
                              .eq('slug', t.slug)
                              .maybeSingle();
                            if (!data) return;
                            setForm({
                              slug: data.slug || '',
                              name: data.name || '',
                              subtitle: data.subtitle || '',
                              description: data.description || '',
                              img: data.img || '',
                              video_path: data.video_path || '',
                              thumbnail_path: data.thumbnail_path || '',
                              audio_preview_path: (data.audio_preview_path || '') as string,
                              model_3d_path: (data.model_3d_path || '') as string,
                              source_path: data.source_path || '',
                              features: Array.isArray(data.features) ? data.features.join(', ') : '',
                              software: Array.isArray(data.software) ? data.software.join(', ') : '',
                              plugins: Array.isArray(data.plugins) ? data.plugins.join(', ') : '',
                              tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
                              category_id: data.category_id || '',
                              subcategory_id: data.subcategory_id || '',
                              sub_subcategory_id: data.sub_subcategory_id || '',
                              meta_title: data.meta_title || '',
                              meta_description: data.meta_description || '',
                            });
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
                      <button
                        onClick={() => onDelete(t.slug)}
                        className="rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-xs font-medium hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
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
              const newSlug = form.slug.trim().toLowerCase();
              const supabase = getSupabaseBrowserClient();
              
              // If editing and slug changed, we need to update downloads and then delete old and create new (since slug is primary key)
              if (isEditing && originalSlug && newSlug !== originalSlug) {
                // First, get the old template data
                const { data: oldTemplate } = await supabase
                  .from('templates')
                  .select('*')
                  .eq('slug', originalSlug)
                  .maybeSingle();
                
                if (oldTemplate) {
                  // Check if new slug already exists
                  const { data: slugExists } = await supabase
                    .from('templates')
                    .select('slug')
                    .eq('slug', newSlug)
                    .maybeSingle();
                  
                  if (slugExists) {
                    throw new Error(`Slug "${newSlug}" already exists. Please choose a different slug.`);
                  }
                  
                  // Update all downloads that reference the old slug to the new slug
                  // This preserves download history when slug changes
                  const { error: updateDownloadsError } = await supabase
                    .from('downloads')
                    .update({ template_slug: newSlug })
                    .eq('template_slug', originalSlug);
                  
                  if (updateDownloadsError) {
                    console.error('Failed to update downloads:', updateDownloadsError);
                    // Continue anyway - the foreign key constraint should handle this
                  }
                  
                  // Delete the old template
                  const { error: deleteError } = await supabase
                    .from('templates')
                    .delete()
                    .eq('slug', originalSlug);
                  
                  if (deleteError) throw deleteError;
                }
              }
              
              // Create/update template with new slug
              const payload = {
                templates: [
                  {
                    slug: newSlug, name: form.name.trim(), subtitle: form.subtitle.trim(), description: form.description.trim(),
                    img: null, video_path: form.video_path.trim() || null, thumbnail_path: form.thumbnail_path.trim() || null, audio_preview_path: form.audio_preview_path.trim() || null, model_3d_path: form.model_3d_path.trim() || null, source_path: form.source_path.trim() || null,
                    features: form.features ? form.features.split(',').map(s => s.trim()).filter(Boolean) : [],
                    software: form.software ? form.software.split(',').map(s => s.trim()).filter(Boolean) : [],
                    plugins: form.plugins ? form.plugins.split(',').map(s => s.trim()).filter(Boolean) : [],
                    tags: form.tags ? form.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
                    category_id: form.category_id || null,
                    subcategory_id: form.subcategory_id || null,
                    sub_subcategory_id: form.sub_subcategory_id || null,
                    meta_title: form.meta_title.trim() || null,
                    meta_description: form.meta_description.trim() || null,
                  }
                ]
              };
              const res = await fetch('/api/admin/seed-templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
              if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Create/update failed');
              }
              await onCreated();
              setTab('list');
              setForm({ slug: '', name: '', subtitle: '', description: '', img: '', video_path: '', thumbnail_path: '', audio_preview_path: '', model_3d_path: '', source_path: '', features: '', software: '', plugins: '', tags: '', category_id: '', subcategory_id: '', sub_subcategory_id: '', meta_title: '', meta_description: '' });
              setIsEditing(false);
              setOriginalSlug(null);
              setSlugManuallyEdited(false);
            } catch (err: any) {
              alert(err?.message || 'Failed to save template');
            }
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
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
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
              onChange={(e) => setForm({ ...form, subcategory_id: e.target.value, sub_subcategory_id: '' })}
              disabled={!form.category_id}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">Select Subcategory</option>
              {filteredSubcategories.map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Sub-Subcategory</label>
            <select
              value={form.sub_subcategory_id}
              onChange={(e) => setForm({ ...form, sub_subcategory_id: e.target.value })}
              disabled={!form.subcategory_id}
              className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="">Select Sub-Subcategory (Optional)</option>
              {filteredSubSubcategories.map((subSub) => (
                <option key={subSub.id} value={subSub.id}>{subSub.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Video File (R2 Storage)</label>
            <div className="flex items-center gap-2">
              <input
                value={form.video_path || ''}
                onChange={(e) => setForm({ ...form, video_path: e.target.value })}
                placeholder="Upload video to R2 or paste direct link"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingVideo ? 'Uploading...' : 'Upload to R2'}
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('video', file); }} />
            </div>
            {form.video_path && (
              <div className="aspect-video w-full max-w-md self-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
                <video src={form.video_path} controls className="h-full w-full" />
              </div>
            )}
            <p className="text-xs text-zinc-500">Upload video file to Cloudflare R2. File will be stored at: category/subcategory/video/{'{filename}'}</p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Thumbnail Image (R2 Storage)</label>
            <div className="flex items-center gap-2">
              <input
                value={form.thumbnail_path || ''}
                onChange={(e) => setForm({ ...form, thumbnail_path: e.target.value })}
                placeholder="Upload thumbnail to R2 or paste direct link"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={uploadingThumbnail}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingThumbnail ? 'Uploading...' : 'Upload to R2'}
              </button>
              <input ref={thumbnailInputRef} type="file" accept="image/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('thumbnail', file); }} />
            </div>
            {form.thumbnail_path && (
              <div className="w-full max-w-md self-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm">
                <img src={form.thumbnail_path} alt="Thumbnail preview" className="w-full h-auto" />
              </div>
            )}
            <p className="text-xs text-zinc-500">Upload thumbnail image to Cloudflare R2. File will be stored at: category/subcategory/thumbnail/{'{filename}'}</p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Audio Preview (R2 Storage) - Optional</label>
            <div className="flex items-center gap-2">
              <input
                value={form.audio_preview_path || ''}
                onChange={(e) => setForm({ ...form, audio_preview_path: e.target.value })}
                placeholder="Upload audio preview to R2 or paste direct link"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => audioPreviewInputRef.current?.click()}
                disabled={uploadingAudioPreview}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingAudioPreview ? 'Uploading...' : 'Upload to R2'}
              </button>
              <input ref={audioPreviewInputRef} type="file" accept="audio/*" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('audio_preview', file); }} />
            </div>
            {form.audio_preview_path && (
              <div className="w-full max-w-md self-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm p-2">
                <audio src={form.audio_preview_path} controls className="w-full" />
              </div>
            )}
            <p className="text-xs text-zinc-500">Upload audio preview file to Cloudflare R2. File will be stored at: category/subcategory/audio/{'{filename}'}</p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">3D Model Preview (R2 Storage) - Optional</label>
            <div className="flex items-center gap-2">
              <input
                value={form.model_3d_path || ''}
                onChange={(e) => setForm({ ...form, model_3d_path: e.target.value })}
                placeholder="Upload 3D model to R2 or paste direct link"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => model3DInputRef.current?.click()}
                disabled={uploadingModel3D}
                className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingModel3D ? 'Uploading...' : 'Upload to R2'}
              </button>
              <input ref={model3DInputRef} type="file" accept=".glb,.gltf,.obj" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('model_3d', file); }} />
            </div>
            {form.model_3d_path && (
              <div className="w-full max-w-md self-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 shadow-sm p-2">
                <p className="text-xs text-zinc-600">3D Model: {form.model_3d_path}</p>
              </div>
            )}
            <p className="text-xs text-zinc-500">Upload 3D model file (GLB, GLTF, OBJ) to Cloudflare R2. File will be stored at: category/subcategory/model/{'{filename}'}</p>
          </div>

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">Source File (R2 Storage)</label>
            <div className="flex items-center gap-2">
              <input
                value={form.source_path || ''}
                onChange={(e) => setForm({ ...form, source_path: e.target.value })}
                placeholder="Upload file to R2 or paste direct link"
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
              <button
                type="button"
                onClick={() => sourceInputRef.current?.click()}
                disabled={uploadingSource}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingSource ? 'Uploading...' : 'Upload to R2'}
              </button>
              <input ref={sourceInputRef} type="file" accept="application/zip,application/x-rar-compressed,.zip,.rar" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile('source', file); }} />
            </div>
            <p className="text-xs text-zinc-500">Upload source file to Cloudflare R2. File will be stored at: category/subcategory/{'{filename}'}</p>
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


