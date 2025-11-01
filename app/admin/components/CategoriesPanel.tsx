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
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categories & Subcategories</h2>
        <div className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 text-xs">
          <button 
            onClick={() => { setTab('categories'); setSelectedCategoryId(null); }}
            className={`px-3 py-1 rounded-full ${tab === 'categories' ? 'bg-white text-black' : 'text-white/80'}`}
          >
            Categories
          </button>
          <button 
            onClick={() => setTab('subcategories')}
            className={`px-3 py-1 rounded-full ${tab === 'subcategories' ? 'bg-white text-black' : 'text-white/80'}`}
          >
            Subcategories
          </button>
        </div>
      </header>

      {tab === 'categories' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Categories</h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-xs text-zinc-400">{cat.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCategory(cat)}
                      className="rounded-full border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="rounded-full border border-red-400 text-red-200 px-2 py-1 text-xs hover:bg-red-500/10"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCategorySubmit} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-medium">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
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
              placeholder="Category name"
              required
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <input
              value={categoryForm.slug}
              onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
              placeholder="slug (auto-generated)"
              required
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <input
              value={categoryForm.icon}
              onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
              placeholder="icon (optional)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <textarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="description (optional)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200"
              >
                {editingCategory ? 'Save' : 'Create'}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryForm({ name: '', slug: '', description: '', icon: '' });
                    setEditingCategory(null);
                  }}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {tab === 'subcategories' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Subcategories</h3>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                className="rounded-lg bg-black/40 border border-white/10 px-3 py-1 text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredSubcategories.map((sub) => {
                const category = categories.find(c => c.id === sub.category_id);
                return (
                  <div key={sub.id} className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-xs text-zinc-400">
                        {category?.name || 'Unknown'} • {sub.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSubcategory(sub)}
                        className="rounded-full border border-white/30 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSubcategory(sub.id)}
                        className="rounded-full border border-red-400 text-red-200 px-2 py-1 text-xs hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubcategorySubmit} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-medium">{editingSubcategory ? 'Edit Subcategory' : 'Add Subcategory'}</h3>
            <select
              value={subcategoryForm.category_id}
              onChange={(e) => {
                setSubcategoryForm({ ...subcategoryForm, category_id: e.target.value });
                setSelectedCategoryId(e.target.value);
              }}
              required
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
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
              placeholder="Subcategory name"
              required
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <input
              value={subcategoryForm.slug}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, slug: e.target.value })}
              placeholder="slug (auto-generated)"
              required
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <textarea
              value={subcategoryForm.description}
              onChange={(e) => setSubcategoryForm({ ...subcategoryForm, description: e.target.value })}
              placeholder="description (optional)"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-zinc-200"
              >
                {editingSubcategory ? 'Save' : 'Create'}
              </button>
              {editingSubcategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSubcategoryForm({ category_id: '', name: '', slug: '', description: '' });
                    setEditingSubcategory(null);
                    setSelectedCategoryId(null);
                  }}
                  className="rounded-full border border-white/30 px-4 py-2 text-sm hover:bg-white/10"
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

