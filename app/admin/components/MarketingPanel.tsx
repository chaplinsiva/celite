"use client";

import { useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

export default function MarketingPanel() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Please fill in both subject and content' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/marketing/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ subject, content }),
      });

      const json = await res.json();

      if (res.ok && json.ok) {
        setMessage({
          type: 'success',
          text: `✅ Successfully sent to ${json.sent} subscribers${json.failed > 0 ? ` (${json.failed} failed)` : ''}`,
        });
        setSubject('');
        setContent('');
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to send emails' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to send emails' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Marketing</h1>
        <p className="text-sm text-zinc-400">Send email to all active subscribers</p>
      </header>

      {message && (
        <div
          className={`rounded-2xl border p-4 ${
            message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-300'
              : 'border-red-500/50 bg-red-500/10 text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6">
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-zinc-200">
            Email Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="block text-sm font-medium text-zinc-200">
              Email Content
            </label>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300 whitespace-pre-wrap">
              {content || <span className="text-zinc-500">No content to preview</span>}
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter email content (HTML supported)..."
              rows={12}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20 font-mono"
            />
          )}
          <p className="text-xs text-zinc-500">
            You can use HTML tags for formatting. The content will be wrapped in a styled email template.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSend}
            disabled={loading || !subject.trim() || !content.trim()}
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send to All Subscribers'}
          </button>
          <button
            onClick={() => {
              setSubject('');
              setContent('');
              setMessage(null);
            }}
            disabled={loading}
            className="rounded-full border border-white/30 px-6 py-2 text-sm hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          <strong>⚠️ Warning:</strong> This will send an email to all active subscribers. Make sure your content is correct before sending.
        </div>
      </div>
    </div>
  );
}

