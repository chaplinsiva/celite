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

type SubSubcategory = {
  id: string;
  subcategory_id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [subSubcategories, setSubSubcategories] = useState<SubSubcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'categories' | 'subcategories' | 'sub_subcategories' | 'hierarchy'>('hierarchy');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'category' | 'subcategory' | 'sub_subcategory'; id: string } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ type: 'category' | 'subcategory' | 'sub_subcategory'; id: string } | null>(null);

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

  const [subSubcategoryForm, setSubSubcategoryForm] = useState({
    subcategory_id: '',
    name: '',
    slug: '',
    description: '',
  });

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<string | null>(null);
  const [editingSubSubcategory, setEditingSubSubcategory] = useState<string | null>(null);

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
        setCategories((catsJson.categories as Category[]) || []);
      }
      if (subsJson.ok) {
        setSubcategories((subsJson.subcategories as Subcategory[]) || []);
      }
      if (subSubsJson.ok) {
        setSubSubcategories((subSubsJson.sub_subcategories as SubSubcategory[]) || []);
      }
    } catch (e) {
      console.error('Failed to load categories/subcategories/sub-subcategories:', e);
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

  const handleSubSubcategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch('/api/admin/sub-subcategories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: editingSubSubcategory || undefined,
          subcategory_id: subSubcategoryForm.subcategory_id,
          name: subSubcategoryForm.name,
          slug: subSubcategoryForm.slug,
          description: subSubcategoryForm.description || null,
        }),
      });

      const json = await res.json();
      if (json.ok) {
        setSubSubcategoryForm({ subcategory_id: '', name: '', slug: '', description: '' });
        setEditingSubSubcategory(null);
        setSelectedSubcategoryId(null);
        await loadData();
      }
    } catch (e) {
      console.error('Failed to save sub-subcategory:', e);
    }
  };

  const handleDeleteSubSubcategory = async (id: string) => {
    if (!confirm('Delete this sub-subcategory?')) return;
    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`/api/admin/sub-subcategories?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.ok) {
        await loadData();
      }
    } catch (e) {
      console.error('Failed to delete sub-subcategory:', e);
    }
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

  const handleEditSubSubcategory = (subSub: SubSubcategory) => {
    setSubSubcategoryForm({
      subcategory_id: subSub.subcategory_id,
      name: subSub.name,
      slug: subSub.slug,
      description: subSub.description || '',
    });
    setEditingSubSubcategory(subSub.id);
    setSelectedSubcategoryId(subSub.subcategory_id);
  };

  if (loading) return <div>Loading...</div>;

  const filteredSubcategories = selectedCategoryId
    ? subcategories.filter(s => s.category_id === selectedCategoryId)
    : subcategories;

  // Handle drag and drop for hierarchy editing
  const handleDragStart = (type: 'category' | 'subcategory' | 'sub_subcategory', id: string) => {
    setDraggedItem({ type, id });
  };

  const handleDragOver = (e: React.DragEvent, type: 'category' | 'subcategory' | 'sub_subcategory', id: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem.id !== id) {
      setDragOverItem({ type, id });
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (targetType: 'category' | 'subcategory' | 'sub_subcategory', targetId: string) => {
    if (!draggedItem || draggedItem.id === targetId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    try {
      // Case 1: Category -> Category (demote category to subcategory)
      if (draggedItem.type === 'category' && targetType === 'category') {
        const targetCategory = categories.find(c => c.id === targetId);
        const draggedCategory = categories.find(c => c.id === draggedItem.id);
        if (!targetCategory || !draggedCategory) return;

        if (!confirm(`Move "${draggedCategory.name}" to become a subcategory under "${targetCategory.name}"?`)) {
          setDraggedItem(null);
          setDragOverItem(null);
          return;
        }

        // Get all subcategories of the dragged category
        const subcatsToMove = subcategories.filter(s => s.category_id === draggedItem.id);
        
        // Create new subcategory from the category
        const createRes = await fetch('/api/admin/subcategories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            category_id: targetId,
            name: draggedCategory.name,
            slug: draggedCategory.slug,
            description: draggedCategory.description || null,
          }),
        });

        const createJson = await createRes.json();
        if (createJson.ok) {
          const newSubId = createJson.subcategory.id;
          
          // Move all subcategories to become sub-subcategories under the new subcategory
          for (const subcat of subcatsToMove) {
            await fetch('/api/admin/sub-subcategories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                subcategory_id: newSubId,
                name: subcat.name,
                slug: subcat.slug,
                description: subcat.description || null,
              }),
            });
          }

          // Delete the old category
          await fetch(`/api/admin/categories?id=${draggedItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          await loadData();
        }
      }
      // Case 2: Subcategory -> Category (promote subcategory to category)
      else if (draggedItem.type === 'subcategory' && targetType === 'category') {
        const draggedSub = subcategories.find(s => s.id === draggedItem.id);
        if (!draggedSub) return;

        if (!confirm(`Promote "${draggedSub.name}" to become a category?`)) {
          setDraggedItem(null);
          setDragOverItem(null);
          return;
        }

        // Get all sub-subcategories of the dragged subcategory
        const subSubcatsToMove = subSubcategories.filter(ss => ss.subcategory_id === draggedItem.id);

        // Create new category from the subcategory
        const createRes = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: draggedSub.name,
            slug: draggedSub.slug,
            description: draggedSub.description || null,
            icon: null,
          }),
        });

        const createJson = await createRes.json();
        if (createJson.ok) {
          const newCatId = createJson.category.id;

          // Move all sub-subcategories to become subcategories under the new category
          for (const subSubcat of subSubcatsToMove) {
            await fetch('/api/admin/subcategories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                category_id: newCatId,
                name: subSubcat.name,
                slug: subSubcat.slug,
                description: subSubcat.description || null,
              }),
            });
          }

          // Delete the old subcategory
          await fetch(`/api/admin/subcategories?id=${draggedItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          await loadData();
        }
      }
      // Case 3: Subcategory -> Subcategory (move subcategory to different category or demote)
      else if (draggedItem.type === 'subcategory' && targetType === 'subcategory') {
        const draggedSub = subcategories.find(s => s.id === draggedItem.id);
        const targetSub = subcategories.find(s => s.id === targetId);
        if (!draggedSub || !targetSub) return;

        // Check if they're in the same category (just move) or different (demote)
        if (draggedSub.category_id === targetSub.category_id) {
          // Same category - just move sub-subcategories
          const subSubcatsToMove = subSubcategories.filter(ss => ss.subcategory_id === draggedItem.id);
          for (const subSubcat of subSubcatsToMove) {
            await fetch('/api/admin/sub-subcategories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                id: subSubcat.id,
                subcategory_id: targetId,
                name: subSubcat.name,
                slug: subSubcat.slug,
                description: subSubcat.description || null,
              }),
            });
          }
          await fetch(`/api/admin/subcategories?id=${draggedItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        } else {
          // Different category - demote to sub-subcategory
          if (!confirm(`Demote "${draggedSub.name}" to sub-subcategory under "${targetSub.name}"?`)) {
            setDraggedItem(null);
            setDragOverItem(null);
            return;
          }

          const subSubcatsToMove = subSubcategories.filter(ss => ss.subcategory_id === draggedItem.id);

          // Create new sub-subcategory from the subcategory
          await fetch('/api/admin/sub-subcategories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              subcategory_id: targetId,
              name: draggedSub.name,
              slug: draggedSub.slug + '-demoted',
              description: draggedSub.description || null,
            }),
          });

          // Move all sub-subcategories to the target subcategory
          for (const subSubcat of subSubcatsToMove) {
            await fetch('/api/admin/sub-subcategories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                id: subSubcat.id,
                subcategory_id: targetId,
                name: subSubcat.name,
                slug: subSubcat.slug,
                description: subSubcat.description || null,
              }),
            });
          }

          // Delete the old subcategory
          await fetch(`/api/admin/subcategories?id=${draggedItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
        }

        await loadData();
      }
      // Case 4: Sub-subcategory -> Subcategory (promote sub-subcategory)
      else if (draggedItem.type === 'sub_subcategory' && targetType === 'subcategory') {
        const draggedSubSub = subSubcategories.find(ss => ss.id === draggedItem.id);
        const targetSub = subcategories.find(s => s.id === targetId);
        if (!draggedSubSub || !targetSub) return;

        if (!confirm(`Promote "${draggedSubSub.name}" to subcategory under "${targetSub.name}"?`)) {
          setDraggedItem(null);
          setDragOverItem(null);
          return;
        }

        // Create new subcategory
        await fetch('/api/admin/subcategories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            category_id: targetSub.category_id,
            name: draggedSubSub.name,
            slug: draggedSubSub.slug + '-promoted',
            description: draggedSubSub.description || null,
          }),
        });

        // Delete old sub-subcategory
        await fetch(`/api/admin/sub-subcategories?id=${draggedItem.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        await loadData();
      }
      // Case 5: Sub-subcategory -> Sub-subcategory (move to different subcategory)
      else if (draggedItem.type === 'sub_subcategory' && targetType === 'sub_subcategory') {
        const draggedSubSub = subSubcategories.find(ss => ss.id === draggedItem.id);
        const targetSubSub = subSubcategories.find(ss => ss.id === targetId);
        if (!draggedSubSub || !targetSubSub) return;

        const targetSub = subcategories.find(s => s.id === targetSubSub.subcategory_id);
        if (!targetSub) return;

        await fetch('/api/admin/sub-subcategories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            id: draggedItem.id,
            subcategory_id: targetSub.id,
            name: draggedSubSub.name,
            slug: draggedSubSub.slug,
            description: draggedSubSub.description || null,
          }),
        });

        await loadData();
      }
    } catch (e) {
      console.error('Failed to move item:', e);
      alert('Failed to move item. Please try again.');
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-900">Categories & Subcategories</h2>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs font-medium">
          <button
            onClick={() => { setTab('categories'); setSelectedCategoryId(null); setSelectedSubcategoryId(null); }}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'categories' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Categories
          </button>
          <button
            onClick={() => { setTab('subcategories'); setSelectedSubcategoryId(null); }}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'subcategories' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Subcategories
          </button>
          <button
            onClick={() => setTab('sub_subcategories')}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'sub_subcategories' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Sub-Subcategories
          </button>
          <button
            onClick={() => setTab('hierarchy')}
            className={`px-4 py-2 rounded-md transition-all ${tab === 'hierarchy' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Hierarchy Editor
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
                  <div className="flex gap-2 items-center">
                    <select
                      value={sub.category_id}
                      onChange={async (e) => {
                        const newCategoryId = e.target.value;
                        if (newCategoryId === sub.category_id) return;
                        if (!confirm(`Move "${sub.name}" to different category? Its sub-subcategories will move with it.`)) return;
                        
                        const supabase = getSupabaseBrowserClient();
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        try {
                          // Update subcategory parent
                          const res = await fetch('/api/admin/subcategories', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              id: sub.id,
                              category_id: newCategoryId,
                              name: sub.name,
                              slug: sub.slug,
                              description: sub.description || null,
                            }),
                          });

                          const json = await res.json();
                          if (json.ok) {
                            // Update all sub-subcategories to point to a subcategory in the new category
                            // First, find or create a subcategory in the new category to move sub-subcategories to
                            const { data: targetSubcategory } = await supabase
                              .from('subcategories')
                              .select('id')
                              .eq('category_id', newCategoryId)
                              .neq('id', sub.id)
                              .limit(1)
                              .maybeSingle();

                            // Move sub-subcategories
                            const subSubsToMove = subSubcategories.filter(ss => ss.subcategory_id === sub.id);
                            for (const subSub of subSubsToMove) {
                              // If there's a target subcategory, move to it, otherwise keep with moved subcategory
                              const targetSubId = targetSubcategory?.id || sub.id;
                              await fetch('/api/admin/sub-subcategories', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  id: subSub.id,
                                  subcategory_id: targetSubId,
                                  name: subSub.name,
                                  slug: subSub.slug,
                                  description: subSub.description || null,
                                }),
                              });
                            }
                            await loadData();
                          }
                        } catch (e) {
                          console.error('Failed to move subcategory:', e);
                          alert('Failed to move subcategory');
                        }
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        // Demote subcategory to sub-subcategory
                        if (!confirm(`Demote "${sub.name}" to sub-subcategory? You'll need to select a parent subcategory.`)) return;
                        
                        const supabase = getSupabaseBrowserClient();
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        // Find another subcategory in the same category to use as parent
                        const otherSubs = subcategories.filter(s => s.category_id === sub.category_id && s.id !== sub.id);
                        if (otherSubs.length === 0) {
                          alert('Cannot demote: No other subcategory in this category to use as parent. Create one first.');
                          return;
                        }

                        const targetSubId = otherSubs[0].id;

                        try {
                          // Create new sub-subcategory
                          const createRes = await fetch('/api/admin/sub-subcategories', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${session.access_token}`,
                            },
                            body: JSON.stringify({
                              subcategory_id: targetSubId,
                              name: sub.name,
                              slug: sub.slug + '-demoted',
                              description: sub.description || null,
                            }),
                          });

                          const createJson = await createRes.json();
                          if (createJson.ok) {
                            // Move all sub-subcategories to the new parent
                            const subSubsToMove = subSubcategories.filter(ss => ss.subcategory_id === sub.id);
                            for (const subSub of subSubsToMove) {
                              await fetch('/api/admin/sub-subcategories', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  id: subSub.id,
                                  subcategory_id: targetSubId,
                                  name: subSub.name,
                                  slug: subSub.slug,
                                  description: subSub.description || null,
                                }),
                              });
                            }
                            
                            // Delete the old subcategory
                            await fetch(`/api/admin/subcategories?id=${sub.id}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${session.access_token}` },
                            });
                            
                            await loadData();
                          }
                        } catch (e) {
                          console.error('Failed to demote subcategory:', e);
                          alert('Failed to demote subcategory');
                        }
                      }}
                      className="rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-100 transition-colors"
                      title="Demote to Sub-Subcategory"
                    >
                      ↓
                    </button>
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

      {tab === 'sub_subcategories' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Sub-Subcategories</h3>
              <select
                value={selectedSubcategoryId || ''}
                onChange={(e) => setSelectedSubcategoryId(e.target.value || null)}
                className="rounded-lg bg-white border border-zinc-200 px-3 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
              >
                <option value="">All Subcategories</option>
                {subcategories.map((sub) => {
                  const category = categories.find(c => c.id === sub.category_id);
                  return (
                    <option key={sub.id} value={sub.id}>
                      {category?.name || 'Unknown'} / {sub.name}
                    </option>
                  );
                })}
              </select>
    </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {subSubcategories
                .filter(subSub => !selectedSubcategoryId || subSub.subcategory_id === selectedSubcategoryId)
                .map((subSub) => {
                  const subcategory = subcategories.find(s => s.id === subSub.subcategory_id);
                  const category = subcategory ? categories.find(c => c.id === subcategory.category_id) : null;
                  return (
                    <div key={subSub.id} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-semibold text-zinc-900">{subSub.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          <span className="font-medium text-zinc-700">{category?.name || 'Unknown'}</span> / <span className="font-medium text-zinc-700">{subcategory?.name || 'Unknown'}</span> • <span className="font-mono">{subSub.slug}</span>
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <select
                          value={subSub.subcategory_id}
                          onChange={async (e) => {
                            const newSubcategoryId = e.target.value;
                            if (newSubcategoryId === subSub.subcategory_id) return;
                            
                            const supabase = getSupabaseBrowserClient();
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;

                            try {
                              const res = await fetch('/api/admin/sub-subcategories', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  id: subSub.id,
                                  subcategory_id: newSubcategoryId,
                                  name: subSub.name,
                                  slug: subSub.slug,
                                  description: subSub.description || null,
                                }),
                              });

                              const json = await res.json();
                              if (json.ok) {
                                await loadData();
                              } else {
                                alert('Failed to move sub-subcategory: ' + json.error);
                              }
                            } catch (e) {
                              console.error('Failed to move sub-subcategory:', e);
                              alert('Failed to move sub-subcategory');
                            }
                          }}
                          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {subcategories.map((sub) => {
                            const parentCategory = categories.find(c => c.id === sub.category_id);
                            return (
                              <option key={sub.id} value={sub.id}>
                                {parentCategory?.name || 'Unknown'} / {sub.name}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          onClick={async () => {
                            // Promote sub-subcategory to subcategory
                            if (!confirm(`Promote "${subSub.name}" to subcategory? This will create a new subcategory.`)) return;
                            
                            const supabase = getSupabaseBrowserClient();
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) return;

                            try {
                              const currentSub = subcategories.find(s => s.id === subSub.subcategory_id);
                              if (!currentSub) return;

                              // Create new subcategory with same name
                              const createRes = await fetch('/api/admin/subcategories', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${session.access_token}`,
                                },
                                body: JSON.stringify({
                                  category_id: currentSub.category_id,
                                  name: subSub.name,
                                  slug: subSub.slug + '-promoted',
                                  description: subSub.description || null,
                                }),
                              });

                              const createJson = await createRes.json();
                              if (createJson.ok) {
                                // Delete the sub-subcategory
                                await fetch(`/api/admin/sub-subcategories?id=${subSub.id}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${session.access_token}` },
                                });
                                await loadData();
                              }
                            } catch (e) {
                              console.error('Failed to promote sub-subcategory:', e);
                              alert('Failed to promote sub-subcategory');
                            }
                          }}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Promote to Subcategory"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleEditSubSubcategory(subSub)}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteSubSubcategory(subSub.id)}
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

          <form onSubmit={handleSubSubcategorySubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
            <h3 className="text-lg font-semibold text-zinc-900 border-b border-zinc-100 pb-4 mb-4">
              {editingSubSubcategory ? 'Edit Sub-Subcategory' : 'Add New Sub-Subcategory'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Parent Subcategory</label>
                <select
                  value={subSubcategoryForm.subcategory_id}
                  onChange={(e) => {
                    setSubSubcategoryForm({ ...subSubcategoryForm, subcategory_id: e.target.value });
                    setSelectedSubcategoryId(e.target.value);
                  }}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm appearance-none"
                >
                  <option value="">Select Subcategory</option>
                  {subcategories.map((sub) => {
                    const category = categories.find(c => c.id === sub.category_id);
                    return (
                      <option key={sub.id} value={sub.id}>
                        {category?.name || 'Unknown'} / {sub.name}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Name</label>
                <input
                  value={subSubcategoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSubSubcategoryForm({
                      ...subSubcategoryForm,
                      name,
                      slug: subSubcategoryForm.slug || name.toLowerCase().replace(/\s+/g, '-'),
                    });
                  }}
                  placeholder="Sub-Subcategory Name"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Slug</label>
                <input
                  value={subSubcategoryForm.slug}
                  onChange={(e) => setSubSubcategoryForm({ ...subSubcategoryForm, slug: e.target.value })}
                  placeholder="slug-auto-generated"
                  required
                  className="w-full px-4 py-2 rounded-lg bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea
                  value={subSubcategoryForm.description}
                  onChange={(e) => setSubSubcategoryForm({ ...subSubcategoryForm, description: e.target.value })}
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
                {editingSubSubcategory ? 'Save Changes' : 'Create Sub-Subcategory'}
              </button>
              {editingSubSubcategory && (
                <button
                  type="button"
                  onClick={() => {
                    setSubSubcategoryForm({ subcategory_id: '', name: '', slug: '', description: '' });
                    setEditingSubSubcategory(null);
                    setSelectedSubcategoryId(null);
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

      {tab === 'hierarchy' && (
        <div className="space-y-6">
          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-zinc-900 mb-2">How to use Hierarchy Editor:</h3>
            <ul className="text-xs text-zinc-600 space-y-1 list-disc list-inside">
              <li>Drag a category and drop it on another category to make it a subcategory</li>
              <li>Drag a subcategory and drop it on a category to move it or promote it to category</li>
              <li>Drag a sub-subcategory and drop it on a subcategory to move or promote it</li>
              <li>Items will be highlighted when you drag over valid drop targets</li>
            </ul>
          </div>

          <div className="space-y-4">
            {categories.map((category) => {
              const categorySubs = subcategories.filter(s => s.category_id === category.id);
              const isDragged = draggedItem?.type === 'category' && draggedItem.id === category.id;
              const isDragOver = dragOverItem?.type === 'category' && dragOverItem.id === category.id;

              return (
                <div
                  key={category.id}
                  draggable
                  onDragStart={() => handleDragStart('category', category.id)}
                  onDragOver={(e) => handleDragOver(e, 'category', category.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop('category', category.id)}
                  onDragEnd={handleDragEnd}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isDragged ? 'opacity-50 border-blue-400 bg-blue-50' :
                    isDragOver ? 'border-blue-500 bg-blue-100 shadow-lg' :
                    'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md'
                  } cursor-move`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📁</span>
                      <h4 className="font-bold text-zinc-900">{category.name}</h4>
                      <span className="text-xs text-zinc-500 font-mono">({category.slug})</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Category</span>
                  </div>

                  {categorySubs.length > 0 && (
                    <div className="ml-6 mt-3 space-y-2 border-l-2 border-zinc-200 pl-4">
                      {categorySubs.map((sub) => {
                        const subSubs = subSubcategories.filter(ss => ss.subcategory_id === sub.id);
                        const isSubDragged = draggedItem?.type === 'subcategory' && draggedItem.id === sub.id;
                        const isSubDragOver = dragOverItem?.type === 'subcategory' && dragOverItem.id === sub.id;

                        return (
                          <div
                            key={sub.id}
                            draggable
                            onDragStart={() => handleDragStart('subcategory', sub.id)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDragOver(e, 'subcategory', sub.id);
                            }}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => {
                              e.stopPropagation();
                              handleDrop('subcategory', sub.id);
                            }}
                            onDragEnd={handleDragEnd}
                            className={`rounded-lg border-2 p-3 transition-all ${
                              isSubDragged ? 'opacity-50 border-orange-400 bg-orange-50' :
                              isSubDragOver ? 'border-orange-500 bg-orange-100 shadow-md' :
                              'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:shadow-sm'
                            } cursor-move`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">📂</span>
                                <h5 className="font-semibold text-zinc-800">{sub.name}</h5>
                                <span className="text-xs text-zinc-500 font-mono">({sub.slug})</span>
                              </div>
                              <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">Subcategory</span>
                            </div>

                            {subSubs.length > 0 && (
                              <div className="ml-6 mt-2 space-y-1 border-l-2 border-zinc-200 pl-3">
                                {subSubs.map((subSub) => {
                                  const isSubSubDragged = draggedItem?.type === 'sub_subcategory' && draggedItem.id === subSub.id;
                                  const isSubSubDragOver = dragOverItem?.type === 'sub_subcategory' && dragOverItem.id === subSub.id;

                                  return (
                                    <div
                                      key={subSub.id}
                                      draggable
                                      onDragStart={() => handleDragStart('sub_subcategory', subSub.id)}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDragOver(e, 'sub_subcategory', subSub.id);
                                      }}
                                      onDragLeave={handleDragLeave}
                                      onDrop={(e) => {
                                        e.stopPropagation();
                                        handleDrop('sub_subcategory', subSub.id);
                                      }}
                                      onDragEnd={handleDragEnd}
                                      className={`rounded border-2 p-2 transition-all ${
                                        isSubSubDragged ? 'opacity-50 border-purple-400 bg-purple-50' :
                                        isSubSubDragOver ? 'border-purple-500 bg-purple-100 shadow-sm' :
                                        'border-zinc-200 bg-white hover:border-zinc-300'
                                      } cursor-move`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">📄</span>
                                          <span className="text-sm font-medium text-zinc-700">{subSub.name}</span>
                                          <span className="text-xs text-zinc-400 font-mono">({subSub.slug})</span>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Sub-Subcategory</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

