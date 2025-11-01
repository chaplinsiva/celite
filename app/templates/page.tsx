import { getSupabaseServerClient } from '../../lib/supabaseServer';
import TemplatesClient from './TemplatesClient';

export const metadata = {
  title: 'Templates - Browse All After Effects Templates',
  description: 'Browse and search through our complete collection of After Effects templates',
};

export default async function TemplatesPage() {
  const supabase = getSupabaseServerClient();
  
  // Fetch all templates for initial load with category/subcategory info
  const { data: templates, error } = await supabase
    .from('templates')
    .select(`
      slug,name,subtitle,description,price,img,video,features,software,plugins,tags,is_featured,
      is_limited_offer,limited_offer_duration_days,limited_offer_start_date,
      category_id,subcategory_id,
      categories(id,name,slug),
      subcategories(id,name,slug)
    `);

  if (error) {
    console.error('Error fetching templates:', error);
  }

  // Also fetch all categories separately for the filter dropdown
  // This ensures categories show even if templates don't have category_id set yet
  const { data: allCategories, error: categoriesError } = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('name');
  
  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
  }

  // Normalize templates data (handle category/subcategory as arrays or objects)
  const normalizedTemplates = (templates || []).map((t: any) => {
    // Supabase join returns categories/subcategories as single objects or null
    // Handle both array and object cases
    let category = null;
    let subcategory = null;
    
    if (t.categories) {
      if (Array.isArray(t.categories) && t.categories.length > 0) {
        category = t.categories[0];
      } else if (typeof t.categories === 'object' && t.categories.id) {
        category = t.categories;
      }
    }
    
    if (t.subcategories) {
      if (Array.isArray(t.subcategories) && t.subcategories.length > 0) {
        subcategory = t.subcategories[0];
      } else if (typeof t.subcategories === 'object' && t.subcategories.id) {
        subcategory = t.subcategories;
      }
    }
    
    return {
      ...t,
      category,
      subcategory,
    };
  });

  // Debug: Log first template to see structure
  if (normalizedTemplates.length > 0) {
    console.log('Sample template structure:', JSON.stringify({
      slug: normalizedTemplates[0].slug,
      name: normalizedTemplates[0].name,
      category_id: normalizedTemplates[0].category_id,
      subcategory_id: normalizedTemplates[0].subcategory_id,
      category: normalizedTemplates[0].category,
      subcategory: normalizedTemplates[0].subcategory,
    }, null, 2));
  }

  return <TemplatesClient initialTemplates={normalizedTemplates} allCategories={allCategories || []} />;
}

