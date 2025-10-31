"use client";

import { getSupabaseBrowserClient } from "../../lib/supabaseClient";

export default function PurchaseDownloadButton({ slug }: { slug: string }) {
  const handleDownload = async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/download/${slug}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slug}.rar`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <button onClick={handleDownload} className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200">
      Download
    </button>
  );
}


