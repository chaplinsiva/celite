import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getYouTubeThumbnailUrl } from "@/lib/utils";
import CreatorFollowButton from "@/components/CreatorFollowButton";

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
  category_id: string | null;
  created_at: string | null;
};

type Category = {
  id: string;
  name: string;
};

function getThumbnail(t: CreatorTemplate) {
  if (t.img) return t.img;
  if (t.video) {
    const thumb = getYouTubeThumbnailUrl(t.video);
    if (thumb) return thumb;
  }
  return "/PNG1.png";
}

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
      "slug,name,subtitle,description,img,video,category_id,created_at,status"
    )
    .eq("creator_shop_id", shop.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const creatorTemplates: CreatorTemplate[] = (templates || []) as any;

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name")
    .order("name");

  const categoryMap = new Map<string, Category>();
  (categories || []).forEach((c: any) => {
    categoryMap.set(c.id, { id: c.id, name: c.name });
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
    <main className="bg-zinc-50 min-h-screen pt-24 pb-20 px-4">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <section className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 mb-2">
            Creator Hub
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-zinc-900 mb-2">
            {shop.name}
          </h1>
          {shop.description && (
            <p className="text-sm sm:text-base text-zinc-600 max-w-2xl">
              {shop.description}
            </p>
          )}
          <div className="mt-4">
            <CreatorFollowButton
              shopId={shop.id}
              shopOwnerId={shop.user_id}
              initialFollowers={followers}
            />
          </div>
        </section>

        {/* Templates by this creator */}
        {creatorTemplates.length === 0 ? (
          <section className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-8 text-center text-sm text-zinc-500">
            This creator hasn&apos;t published any templates yet.
          </section>
        ) : (
          <section className="space-y-8">
            {groupedSections.map((group, idx) => (
              <div key={group.category?.id || `uncat-${idx}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                    {group.category ? group.category.name : "Other Templates"}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/product/${t.slug}`}
                      className="group flex flex-col bg-white rounded-xl overflow-hidden border border-zinc-200 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300"
                    >
                      <div className="relative aspect-video overflow-hidden bg-zinc-100">
                        <img
                          src={getThumbnail(t)}
                          alt={t.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <h3 className="font-bold text-zinc-900 text-base leading-tight mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {t.name}
                        </h3>
                        {t.subtitle && (
                          <p className="text-xs text-zinc-500 line-clamp-2">
                            {t.subtitle}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

