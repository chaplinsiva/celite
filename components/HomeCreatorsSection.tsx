"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabaseClient";
import CreatorFollowButton from "./CreatorFollowButton";

type CreatorShop = {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
};

export default function HomeCreatorsSection() {
  const [creators, setCreators] = useState<
    (CreatorShop & { followers: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: shops } = await supabase
          .from("creator_shops")
          .select("id,user_id,slug,name,description")
          .order("created_at", { ascending: false })
          .limit(8);

        const base: CreatorShop[] = (shops as any) || [];
        const enriched: (CreatorShop & { followers: number })[] = [];

        for (const shop of base) {
          const { count } = await supabase
            .from("creator_followers")
            .select("id", { count: "exact", head: true })
            .eq("creator_shop_id", shop.id);
          enriched.push({
            ...shop,
            followers: count ?? 0,
          });
        }

        setCreators(enriched);
      } catch (e) {
        console.error("Failed to load creators for home section", e);
        setCreators([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || creators.length === 0) return null;

  return (
    <section className="py-16 border-t border-zinc-100 bg-background">
      <div className="max-w-6xl mx-auto px-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900">
              Featured Creators
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Follow studios you love and see their latest templates in your
              following feed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {creators.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <Link
                  href={`/${c.slug}`}
                  className="text-base font-semibold text-zinc-900 hover:text-blue-600"
                >
                  {c.name}
                </Link>
                {c.description && (
                  <p className="text-xs text-zinc-500 line-clamp-3">
                    {c.description}
                  </p>
                )}
              </div>
              <div className="mt-4">
                <CreatorFollowButton
                  shopId={c.id}
                  shopOwnerId={c.user_id}
                  initialFollowers={c.followers}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


