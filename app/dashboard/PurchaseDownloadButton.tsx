"use client";

import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function PurchaseDownloadButton({ slug }: { slug: string }) {
  const handleDownload = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const downloadUrl = `/api/download/${slug}?token=${encodeURIComponent(session.access_token)}`;
      const popup = window.open(downloadUrl, '_blank');
      if (!popup) {
        window.location.href = downloadUrl;
      }
    } catch {}
  };

  return (
    <button onClick={handleDownload} className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200">
      Download
    </button>
  );
}


