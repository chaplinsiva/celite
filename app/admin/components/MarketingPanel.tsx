"use client";

import { useState, useEffect } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabaseClient';

type TargetAudience = 'subscribers' | 'non-subscribers' | 'all';
type EmailMode = 'bulk' | 'single';

type User = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

export default function MarketingPanel() {
  const [mode, setMode] = useState<EmailMode>('bulk');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('subscribers');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preview, setPreview] = useState(false);

  // Load users for single email mode
  useEffect(() => {
    if (mode === 'single') {
      loadUsers();
    }
  }, [mode]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const supabase = getSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setUsers(json.users || []);
      }
    } catch (e: any) {
      console.error('Failed to load users:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Please fill in both subject and content' });
      return;
    }

    if (mode === 'single' && !selectedUser) {
      setMessage({ type: 'error', text: 'Please select a user' });
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

      const endpoint = mode === 'single'
        ? '/api/admin/marketing/send-email-single'
        : '/api/admin/marketing/send-email';

      const body = mode === 'single'
        ? { subject, content, userId: selectedUser }
        : { subject, content, targetAudience };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (res.ok && json.ok) {
        if (mode === 'single') {
          const user = users.find(u => u.id === selectedUser);
          setMessage({
            type: 'success',
            text: `✅ Successfully sent email to ${user?.email || 'user'}`,
          });
        } else {
          const audienceText = targetAudience === 'subscribers' ? 'subscribers' : targetAudience === 'non-subscribers' ? 'non-subscribers' : 'users';
          setMessage({
            type: 'success',
            text: `✅ Successfully sent to ${json.sent} ${audienceText}${json.failed > 0 ? ` (${json.failed} failed)` : ''}`,
          });
        }
        setSubject('');
        setContent('');
        if (mode === 'single') {
          setSelectedUser('');
          setSearchQuery('');
        }
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to send email' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Failed to send email' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Marketing</h1>
        <p className="text-sm text-zinc-400">Send email to subscribers, non-subscribers, all users, or a specific user</p>
      </header>

      {/* Mode Toggle */}
      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/40 p-1">
        <button
          onClick={() => {
            setMode('bulk');
            setMessage(null);
          }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${mode === 'bulk'
              ? 'bg-white text-black'
              : 'text-zinc-300 hover:bg-white/10'
            }`}
        >
          Bulk Email
        </button>
        <button
          onClick={() => {
            setMode('single');
            setMessage(null);
          }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${mode === 'single'
              ? 'bg-white text-black'
              : 'text-zinc-300 hover:bg-white/10'
            }`}
        >
          Send to User
        </button>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 ${message.type === 'success'
              ? 'border-green-500/50 bg-green-500/10 text-green-300'
              : 'border-red-500/50 bg-red-500/10 text-red-300'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/10 bg-black/40 p-6">
        {mode === 'bulk' ? (
          <div className="space-y-2">
            <label htmlFor="targetAudience" className="block text-sm font-medium text-zinc-200">
              Target Audience
            </label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="subscribers"
                  checked={targetAudience === 'subscribers'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-zinc-300">Subscribers Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="non-subscribers"
                  checked={targetAudience === 'non-subscribers'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-zinc-300">Non-Subscribers Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="targetAudience"
                  value="all"
                  checked={targetAudience === 'all'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-zinc-300">All Users</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="userSelect" className="block text-sm font-medium text-zinc-200">
              Select User
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => {
                  // Delay hiding dropdown to allow click events
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="Search by email or name... (click to see all users)"
                className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-violet-400/70 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
              {showDropdown && users.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm">
                  {(searchQuery === '' ? users : filteredUsers).slice(0, 100).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent input blur
                        setSelectedUser(user.id);
                        setSearchQuery(user.email || '');
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 ${selectedUser === user.id ? 'bg-white/10' : ''
                        }`}
                    >
                      <div className="text-white">{user.email}</div>
                      {(user.first_name || user.last_name) && (
                        <div className="text-xs text-zinc-400">
                          {user.first_name} {user.last_name}
                        </div>
                      )}
                    </button>
                  ))}
                  {searchQuery === '' && users.length > 100 && (
                    <div className="px-4 py-2 text-xs text-zinc-400 border-t border-white/10">
                      Showing first 100 of {users.length} users. Type to search for specific users.
                    </div>
                  )}
                  {searchQuery && filteredUsers.length === 0 && (
                    <div className="px-4 py-2 text-sm text-zinc-400">
                      No users found matching "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-300">
                Selected: {users.find(u => u.id === selectedUser)?.email}
              </div>
            )}
            {loadingUsers && (
              <div className="text-sm text-zinc-400">Loading users...</div>
            )}
          </div>
        )}

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
            disabled={loading || !subject.trim() || !content.trim() || (mode === 'single' && !selectedUser)}
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Sending...' : mode === 'single'
              ? 'Send Email'
              : `Send to ${targetAudience === 'subscribers' ? 'Subscribers' : targetAudience === 'non-subscribers' ? 'Non-Subscribers' : 'All Users'}`}
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

        {mode === 'bulk' && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
            <strong>⚠️ Warning:</strong> This will send an email to {targetAudience === 'subscribers' ? 'all active subscribers' : targetAudience === 'non-subscribers' ? 'all non-subscribers' : 'all users'}. Make sure your content is correct before sending.
          </div>
        )}
      </div>
    </div>
  );
}

