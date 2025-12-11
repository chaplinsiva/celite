"use client";

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { useLoginModal } from "../context/LoginModalContext";
import { getSupabaseBrowserClient } from "../lib/supabaseClient";

export default function CreatorFollowButton({
  shopId,
  shopOwnerId,
  initialFollowers,
}: {
  shopId: string;
  shopOwnerId: string;
  initialFollowers: number;
}) {
  const { user } = useAppContext();
  const { openLoginModal } = useLoginModal();
  const [followers, setFollowers] = useState(initialFollowers);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsFollowing(false);
        return;
      }
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase
          .from("creator_followers")
          .select("id")
          .eq("creator_shop_id", shopId)
          .eq("user_id", (user as any).id)
          .maybeSingle();
        setIsFollowing(!!data);
      } catch {
        setIsFollowing(false);
      }
    };
    check();
  }, [user, shopId]);

  // Do not show follow button for the owner (after all hooks)
  if (user && (user as any).id === shopOwnerId) {
    return (
      <div className="text-xs text-zinc-500">
        {followers} {followers === 1 ? "Follower" : "Followers"}
      </div>
    );
  }

  const toggleFollow = async () => {
    if (!user) {
      openLoginModal();
      return;
    }
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      if (isFollowing) {
        await supabase
          .from("creator_followers")
          .delete()
          .eq("creator_shop_id", shopId)
          .eq("user_id", (user as any).id);
        setIsFollowing(false);
        setFollowers((f) => Math.max(0, f - 1));
      } else {
        await supabase.from("creator_followers").insert({
          creator_shop_id: shopId,
          user_id: (user as any).id,
        });
        setIsFollowing(true);
        setFollowers((f) => f + 1);
      }
    } catch (e) {
      console.error("Failed to toggle follow", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-zinc-500">
        {followers} {followers === 1 ? "Follower" : "Followers"}
      </div>
      <button
        type="button"
        onClick={toggleFollow}
        disabled={loading}
        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
          isFollowing
            ? "bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800"
            : "bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50"
        } disabled:opacity-60`}
      >
        {loading ? "..." : isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}


