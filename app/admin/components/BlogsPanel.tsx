"use client";

// agent-notes: { ctx: "Admin Blogs Management Panel with full CRUD, FAQ builder, live preview, and SEO settings", deps: [lucide-react, lib/supabaseClient], state: active, last: "sato@2026-08-16" }

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  CheckCircle,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface BlogFAQ {
  question: string;
  answer: string;
}

interface BlogItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt?: string;
  cover_image?: string;
  category: string;
  category_slug: string;
  tags?: string[];
  author_name?: string;
  author_role?: string;
  author_avatar?: string;
  author_bio?: string;
  read_time?: string;
  featured?: boolean;
  status: 'published' | 'draft' | 'archived';
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  content_html: string;
  faqs?: BlogFAQ[];
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export default function BlogsPanel() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'author' | 'faqs' | 'preview'>('content');

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    slug: string;
    subtitle: string;
    excerpt: string;
    cover_image: string;
    category: string;
    category_slug: string;
    tags: string;
    author_name: string;
    author_role: string;
    author_avatar: string;
    author_bio: string;
    read_time: string;
    featured: boolean;
    status: 'published' | 'draft' | 'archived';
    meta_title: string;
    meta_description: string;
    keywords: string;
    content_html: string;
    faqs: BlogFAQ[];
  }>({
    title: '',
    slug: '',
    subtitle: '',
    excerpt: '',
    cover_image: '/hero_ae_template.png',
    category: 'Wedding & Video',
    category_slug: 'wedding-video',
    tags: 'After Effects, Wedding Templates, Save the Date',
    author_name: 'Celite Creative Team',
    author_role: 'Motion Design & Video Production Specialists',
    author_avatar: '/PNG1.png',
    author_bio: 'Written and curated by Celite’s in-house motion designers and video editors.',
    read_time: '6 min read',
    featured: false,
    status: 'published',
    meta_title: '',
    meta_description: '',
    keywords: 'after effects wedding templates, save the date video',
    content_html: '',
    faqs: [],
  });

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/blogs', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setBlogs(json.blogs || []);
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to fetch blogs' });
      }
    } catch (e: unknown) {
      console.error('Error loading blogs:', e);
      const errMsg = e instanceof Error ? e.message : 'Error connecting to database';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  const generateSlugFromTitle = (title: string) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  };

  const handleTitleChange = (newTitle: string) => {
    if (!isEditing || !formData.slug) {
      setFormData((prev) => ({
        ...prev,
        title: newTitle,
        slug: generateSlugFromTitle(newTitle),
        meta_title: prev.meta_title ? prev.meta_title : `${newTitle} • Celite`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({
      title: '',
      slug: '',
      subtitle: '',
      excerpt: '',
      cover_image: '/hero_ae_template.png',
      category: 'Wedding & Video',
      category_slug: 'wedding-video',
      tags: 'After Effects, Wedding Templates, Motion Graphics',
      author_name: 'Celite Creative Team',
      author_role: 'Motion Design & Video Production Specialists',
      author_avatar: '/PNG1.png',
      author_bio: 'Written and curated by Celite’s in-house motion designers.',
      read_time: '6 min read',
      featured: false,
      status: 'published',
      meta_title: '',
      meta_description: '',
      keywords: '',
      content_html: `<h2>Introduction</h2>\n<p>Write your detailed article content here...</p>\n\n<div class="callout-box">\n  <h4>💡 Pro Tip</h4>\n  <p>Share a key industry tip or workflow insight.</p>\n</div>`,
      faqs: [
        {
          question: 'What software is required for this template?',
          answer: 'Adobe After Effects 2024 or newer with no third-party plugins required.',
        },
      ],
    });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  const openEditModal = (blog: BlogItem) => {
    setIsEditing(true);
    setFormData({
      id: blog.id,
      title: blog.title,
      slug: blog.slug,
      subtitle: blog.subtitle || '',
      excerpt: blog.excerpt || '',
      cover_image: blog.cover_image || '/hero_ae_template.png',
      category: blog.category,
      category_slug: blog.category_slug,
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      author_name: blog.author_name || 'Celite Creative Team',
      author_role: blog.author_role || 'Motion Design & Video Production Specialists',
      author_avatar: blog.author_avatar || '/PNG1.png',
      author_bio: blog.author_bio || '',
      read_time: blog.read_time || '6 min read',
      featured: !!blog.featured,
      status: blog.status || 'published',
      meta_title: blog.meta_title || '',
      meta_description: blog.meta_description || '',
      keywords: Array.isArray(blog.keywords) ? blog.keywords.join(', ') : '',
      content_html: blog.content_html || '',
      faqs: Array.isArray(blog.faqs) ? blog.faqs : [],
    });
    setActiveTab('content');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.slug.trim() || !formData.content_html.trim()) {
      setMessage({ type: 'error', text: 'Title, slug, and content are required.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        keywords: formData.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      };

      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setMessage({
          type: 'success',
          text: isEditing ? 'Blog updated successfully!' : 'Blog created successfully!',
        });
        setIsModalOpen(false);
        await loadBlogs();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to save blog' });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error saving blog';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the blog "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/admin/blogs?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setMessage({ type: 'success', text: 'Blog deleted successfully.' });
        await loadBlogs();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to delete blog' });
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Error deleting blog';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleToggleFeatured = async (blog: BlogItem) => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...blog,
          featured: !blog.featured,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        await loadBlogs();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { question: '', answer: '' }],
    }));
  };

  const handleRemoveFaq = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setFormData((prev) => {
      const newFaqs = [...prev.faqs];
      newFaqs[index][field] = value;
      return { ...prev, faqs: newFaqs };
    });
  };

  // Filtered Blogs
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      searchQuery === '' ||
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || blog.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const publishedCount = blogs.filter((b) => b.status === 'published').length;
  const draftCount = blogs.filter((b) => b.status === 'draft').length;
  const featuredCount = blogs.filter((b) => b.featured).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-zinc-500 hover:text-zinc-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <span>📰 Celite Blog &amp; SEO Articles</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create, edit, publish, and manage SEO long-form articles written by Celite to boost organic traffic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBlogs}
            disabled={loading}
            className="p-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Refresh blogs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Blog</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Articles</div>
          <div className="text-2xl font-bold text-zinc-900 mt-1">{blogs.length}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Published</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Drafts</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{draftCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-white border border-zinc-200 shadow-sm">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Featured</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{featuredCount}</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, slug, category..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Blogs Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-zinc-500 text-sm">Loading articles from database...</div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 text-sm">
            No blogs found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Article / Title</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Featured</th>
                  <th className="px-6 py-3.5">Read Time</th>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredBlogs.map((blog) => (
                  <tr key={blog.id || blog.slug} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <div className="font-bold text-zinc-900 line-clamp-1">{blog.title}</div>
                        <div className="text-xs text-blue-600 font-mono mt-0.5">/blogs/{blog.slug}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        {blog.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                          blog.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : blog.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            blog.status === 'published' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                        />
                        {blog.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleFeatured(blog)}
                        title="Toggle Featured status"
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                          blog.featured
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-zinc-100 text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${blog.featured ? 'text-blue-600' : ''}`} />
                        <span>{blog.featured ? 'Featured' : 'Standard'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{blog.read_time || '5 min'}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">
                      {blog.published_at
                        ? new Date(blog.published_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/blogs/${blog.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="View Live Article"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => openEditModal(blog)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                          title="Edit Article"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(blog.id, blog.title)}
                          className="p-2 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {isEditing ? 'Edit Blog Article' : 'Create New Blog Article'}
                </h3>
                <p className="text-xs text-zinc-500">
                  Fill in article details, HTML content, SEO metadata, and FAQs.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tab Bar */}
            <div className="flex border-b border-zinc-200 px-6 bg-white">
              {(
                [
                  { id: 'content', label: 'Article & Content' },
                  { id: 'seo', label: 'SEO & Metadata' },
                  { id: 'author', label: 'Author & Settings' },
                  { id: 'faqs', label: `FAQs (${formData.faqs.length})` },
                  { id: 'preview', label: 'Live Preview' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Article Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="e.g. Top 10 After Effects Wedding Templates for 2026"
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        URL Slug *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        placeholder="e.g. top-10-after-effects-wedding-templates-2026"
                        className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono text-blue-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Category &amp; Category Slug *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value,
                              category_slug: generateSlugFromTitle(e.target.value),
                            })
                          }
                          placeholder="Wedding & Video"
                          className="px-3 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                        <input
                          type="text"
                          required
                          value={formData.category_slug}
                          onChange={(e) => setFormData({ ...formData, category_slug: e.target.value })}
                          placeholder="wedding-video"
                          className="px-3 py-2.5 rounded-lg border border-zinc-300 text-sm font-mono text-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Subtitle / Headline Lead
                    </label>
                    <input
                      type="text"
                      value={formData.subtitle}
                      onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                      placeholder="Elevate your wedding films, invitations, and romantic slideshows..."
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Excerpt / Summary (for blog list card)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      placeholder="Short 2-3 sentence overview shown in blog cards and social previews..."
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Cover Image Path or URL
                    </label>
                    <input
                      type="text"
                      value={formData.cover_image}
                      onChange={(e) => setFormData({ ...formData, cover_image: e.target.value })}
                      placeholder="/hero_ae_template.png or https://..."
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      HTML Content *
                    </label>
                    <textarea
                      rows={12}
                      required
                      value={formData.content_html}
                      onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                      placeholder="<h2>Section Title</h2><p>Article body here...</p>"
                      className="w-full font-mono text-xs px-4 py-3 rounded-lg border border-zinc-300 bg-zinc-900 text-zinc-100 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Meta Title (for Google &amp; OpenGraph)
                    </label>
                    <input
                      type="text"
                      value={formData.meta_title}
                      onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                      placeholder="e.g. Top 10 After Effects Wedding Templates (2026) • Celite"
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Meta Description (Search snippet)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.meta_description}
                      onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                      placeholder="Compelling 150-160 character description designed for Google search clicks..."
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Target Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.keywords}
                      onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                      placeholder="after effects wedding templates, save the date ae, cinematic templates"
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="After Effects, Wedding, Motion Graphics, Tutorials"
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'author' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Author Name
                      </label>
                      <input
                        type="text"
                        value={formData.author_name}
                        onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Author Role
                      </label>
                      <input
                        type="text"
                        value={formData.author_role}
                        onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Author Avatar Image
                    </label>
                    <input
                      type="text"
                      value={formData.author_avatar}
                      onChange={(e) => setFormData({ ...formData, author_avatar: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Author Bio
                    </label>
                    <textarea
                      rows={2}
                      value={formData.author_bio}
                      onChange={(e) => setFormData({ ...formData, author_bio: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 text-sm outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-200">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Read Time
                      </label>
                      <input
                        type="text"
                        value={formData.read_time}
                        onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                        placeholder="7 min read"
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 text-sm outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Publish Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as 'published' | 'draft' | 'archived',
                          })
                        }
                        className="w-full px-4 py-2 rounded-lg border border-zinc-300 text-sm outline-none bg-white font-medium"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Featured Status
                      </label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.featured}
                          onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-zinc-700">Feature on Homepage/Blog Hero</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faqs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                    <div>
                      <h4 className="text-sm font-bold text-zinc-800">Frequently Asked Questions</h4>
                      <p className="text-xs text-zinc-500">
                        Added to the bottom of the article and indexed as rich Google FAQ schema.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add FAQ</span>
                    </button>
                  </div>

                  {formData.faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-600">Question #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(index)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>

                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                        placeholder="Question title..."
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                      />

                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                        placeholder="Detailed answer text..."
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      />
                    </div>
                  ))}

                  {formData.faqs.length === 0 && (
                    <div className="text-center py-8 text-zinc-400 text-xs">
                      No FAQs added yet. Click &quot;Add FAQ&quot; to create one.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="p-6 rounded-xl bg-[#07080c] text-zinc-100 border border-zinc-800 space-y-6">
                  <div>
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold">
                      {formData.category}
                    </span>
                    <h1 className="text-2xl font-bold text-white mt-3">{formData.title || 'Untitled Article'}</h1>
                    <p className="text-zinc-400 text-sm mt-1">{formData.subtitle}</p>
                  </div>

                  <div
                    className="blog-prose border-t border-zinc-800 pt-6"
                    dangerouslySetInnerHTML={{ __html: formData.content_html || '<p>No content entered.</p>' }}
                  />
                </div>
              )}

              {/* Modal Footer Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-600 hover:bg-zinc-100 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditing ? 'Update Article' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
