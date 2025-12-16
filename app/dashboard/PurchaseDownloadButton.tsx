"use client";

import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function PurchaseDownloadButton({ slug }: { slug: string }) {
  const handleDownload = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/download/${slug}`, { headers: { Authorization: `Bearer ${session.access_token}` } });

      const json = await res.json();

      // Handle redirect URL (signed URL for direct download)
      if (json.redirect && json.url) {
        window.location.href = json.url;
        return;
      }

      // Handle errors
      if (json.error) {
        console.error('Download failed:', json.error);
      }
    } catch { }
  };

  return (
    <button onClick={handleDownload} className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200">
      Download
    </button>
  );
}


