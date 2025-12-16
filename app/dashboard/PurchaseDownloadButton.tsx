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
      
      // Check if response is JSON (redirect to external URL)
      const contentType = res.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const json = await res.json();
        if (json.redirect && json.url) {
          // Redirect to external drive link
          window.open(json.url, '_blank');
          return;
        }
        return; // If it's JSON but no redirect, return early
      }
      
      // Direct file download - get filename from header
      const contentDisposition = res.headers.get('content-disposition') || '';
      let filename = `${slug}.zip`;
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }

      // Create blob and download without exposing URL
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none'; // Hide the link
      document.body.appendChild(link);
      link.click();
      // Clean up immediately to hide the blob URL
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch {}
  };

  return (
    <button onClick={handleDownload} className="mt-3 inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-zinc-200">
      Download
    </button>
  );
}


