import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import CreatorFollowButton from "@/components/CreatorFollowButton";
import CreatorShopClient from "./CreatorShopClient";

interface PageProps {
  params: Promise<{ shopSlug: string }>;
}

type CreatorTemplate = {
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  img: string | null;
  video: string | null;
  video_path?: string | null;
  thumbnail_path?: string | null;
  audio_preview_path?: string | null;
  model_3d_path?: string | null;
  category_id: string | null;
  created_at: string | null;
};

type Category = {
  id: string;
  name: string;
  slug?: string | null;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const supabase = getSupabaseServerClient();

  const { data: shop } = await supabase
    .from("creator_shops")
    .select("name, description")
    .eq("slug", params.shopSlug)
    .maybeSingle();

  if (!shop) {
    return {
      title: "Creator not found | Celite",
    };
  }

  const title = `${shop.name} | Celite Creator`;
  const description =
    shop.description ||
    "Discover templates and assets from this Celite creator.";

  return {
    title,
    description,
  };
}

export default async function CreatorShopPage(props: PageProps) {
  const params = await props.params;
  const supabase = getSupabaseServerClient();

  const { data: shop } = await supabase
    .from("creator_shops")
    .select("id, user_id, name, description, slug")
    .eq("slug", params.shopSlug)
    .maybeSingle();

  if (!shop) return notFound();

  const { data: templates } = await supabase
    .from("templates")
    .select(
      "slug,name,subtitle,description,img,video,video_path,thumbnail_path,audio_preview_path,model_3d_path,category_id,created_at,status"
    )
    .eq("creator_shop_id", shop.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const creatorTemplates: CreatorTemplate[] = (templates || []) as any;

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name,slug")
    .order("name");

  const categoryMap = new Map<string, Category>();
  (categories || []).forEach((c: any) => {
    categoryMap.set(c.id, { id: c.id, name: c.name, slug: c.slug });
  });

  const grouped = new Map<string, { category: Category | null; items: CreatorTemplate[] }>();

  for (const t of creatorTemplates) {
    const cat =
      t.category_id && categoryMap.has(t.category_id)
        ? categoryMap.get(t.category_id)!
        : null;
    const key = cat ? cat.id : "__uncategorized__";
    if (!grouped.has(key)) {
      grouped.set(key, {
        category: cat,
        items: [],
      });
    }
    grouped.get(key)!.items.push(t);
  }

  const groupedSections = Array.from(grouped.values());

  const { count: followerCount } = await supabase
    .from("creator_followers")
    .select("id", { count: "exact", head: true })
    .eq("creator_shop_id", shop.id);

  const followers = followerCount ?? 0;

  return (
    <main className="bg-background min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <section className="bg-background rounded-3xl border border-zinc-200 shadow-lg p-8 sm:p-12 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/10 to-orange-500/10 rounded-full blur-3xl -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3 inline-block px-3 py-1 bg-blue-50 rounded-full">
              Creator Hub
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-zinc-900 mb-4 bg-gradient-to-r from-zinc-900 to-zinc-700 bg-clip-text text-transparent">
              {shop.name}
            </h1>
            {shop.description && (
              <p className="text-base sm:text-lg text-zinc-600 max-w-3xl leading-relaxed mb-6">
                {shop.description}
              </p>
            )}
            {shop.user_id && (
              <div className="mt-6">
                <CreatorFollowButton
                  shopId={shop.id}
                  shopOwnerId={shop.user_id}
                  initialFollowers={followers}
                />
              </div>
            )}
          </div>
        </section>

        {/* Templates by this creator */}
        {creatorTemplates.length === 0 ? (
          <section className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-zinc-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-base text-zinc-600 font-medium">
                This creator hasn&apos;t published any templates yet.
              </p>
            </div>
          </section>
        ) : (
          <CreatorShopClient groupedSections={groupedSections} />
        )}
      </div>
    </main>
  );
}

