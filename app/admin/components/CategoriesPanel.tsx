"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

type Subcategory = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'categories' | 'subcategories'>('categories');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
  });

  const [subcategoryForm, setSubcategoryForm] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
  });

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

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
        setCategories((catsJson.categories as Category[]) || []);
      }
      if (subsJson.ok) {
        setSubcategories((subsJson.subcategories as Subcategory[]) || []);
      }
    } catch (e) {
      console.error('Failed to load categories/subcategories:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingCategory || undefined,
          name: categoryForm.name,
          slug: categoryForm.slug,
          description: categoryForm.description || null,
          icon: categoryForm.icon || null,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setCategoryForm({ name: '', slug: '', description: '', icon: '' });
        setEditingCategory(null);
        await loadData();
      }
    } catch (e) {
      console.error('Failed to save category:', e);
    }
  };

  const handleSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/admin/subcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingSubcategory || undefined,
          category_id: subcategoryForm.category_id,
          name: subcategoryForm.name,
          slug: subcategoryForm.slug,
          description: subcategoryForm.description || null,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSubcategoryForm({ category_id: '', name: '', slug: '', description: '' });
        setEditingSubcategory(null);
        setSelectedCategoryId(null);
        await loadData();
      }
    } catch (e) {
      console.error('Failed to save subcategory:', e);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? All subcategories and templates in this category will be affected.')) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Failed to delete category:', e);
    }
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm('Delete this subcategory?')) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/subcategories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Failed to delete subcategory:', e);
    }
  };

  const handleEditCategory = (cat: Category) => {
    setCategoryForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      icon: cat.icon || '',
    });
    setEditingCategory(cat.id);
  };

  const handleEditSubcategory = (sub: Subcategory) => {
    setSubcategoryForm({
      category_id: sub.category_id,
      name: sub.name,
      slug: sub.slug,
      description: sub.description || '',
    });
    setEditingSubcategory(sub.id);
    setSelectedCategoryId(sub.category_id);
  };

  if (loading) return <div>Loading...</div>;

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter(s => s.category_id === selectedCategoryId)
    : subcategories;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">Categories & Subcategories</h2>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs font-medium">
          <button
            onClick={() => { setTab('categories'); setSelectedCategoryId(null); }}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'categories' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Categories
          </button>
          <button
            onClick={() => setTab('subcategories')}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'subcategories' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Subcategories
          </button>
        </div>
      </header>

      {tab === 'categories' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">All Categories</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-semibold text-zinc-900">{cat.name}</p>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{cat.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCategorySubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-100 pb-4 mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Name</label>
                <input
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCategoryForm({
                      ...categoryForm,
                      name,
                      slug: categoryForm.slug || name.toLowerCase().replace(/\s+/g, '-'),
                    });
                  }}
                  placeholder="Category Name"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Slug</label>
                <input
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                  placeholder="slug-auto-generated"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Icon Class used in code</label>
                <input
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                  placeholder="e.g. Activity, Box, Camera..."
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryForm({ name: '', slug: '', description: '', icon: '' });
                    setEditingCategory(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === 'subcategories' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Subcategories</h3>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredSubcategories.map((sub) => {
                const category = categories.find(c => c.id === sub.category_id);
                return (
                  <div key={sub.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                    <div>
                      <p className="font-semibold text-zinc-900">{sub.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        <span className="font-medium text-zinc-700">{category?.name || 'Unknown'}</span> • <span className="font-mono">{sub.slug}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSubcategory(sub)}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubcategorySubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-100 pb-4 mb-4">
              {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Parent Category</label>
                <select
                  value={subcategoryForm.category_id}
                  onChange={(e) => {
                    setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value });
                    setSelectedCategoryId(e.target.value);
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Name</label>
                <input
                  value={subcategoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSubcategoryForm({
                      ...subcategoryForm,
                      name,
                      slug: subcategoryForm.slug || name.toLowerCase().replace(/\s+/g, '-'),
                    });
                  }}
                  placeholder="Subcategory Name"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Slug</label>
                <input
                  value={subcategoryForm.slug}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, slug: e.target.value })}
                  placeholder="slug-auto-generated"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={subcategoryForm.description}
                  onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 text-white px-6 py-2 text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                {editingSubcategory ? 'Save Changes' : 'Create Subcategory'}
              </button>
              {editingSubcategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSubcategoryForm({ category_id: '', name: '', slug: '', description: '' });
                    setEditingSubcategory(null);
                    setSelectedCategoryId(null);
                  }}
                  className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

