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
        <h1 className="text-2xl font-bold text-zinc-900">Marketing</h1>
        <p className="mt-1 text-sm text-zinc-500">Send email to subscribers, non-subscribers, all users, or a specific user</p>
      </header>

      {/* Mode Toggle */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 w-fit">
        <button
          onClick={() => {
            setMode('bulk');
            setMessage(null);
          }}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${mode === 'bulk'
              ? 'bg-white text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 shadow-none'
            }`}
        >
          Bulk Email
        </button>
        <button
          onClick={() => {
            setMode('single');
            setMessage(null);
          }}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${mode === 'single'
              ? 'bg-white text-zinc-900'
              : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 shadow-none'
            }`}
        >
          Send to User
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
            }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {mode === 'bulk' ? (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-zinc-700">
              Target Audience
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="targetAudience"
                  value="subscribers"
                  checked={targetAudience === 'subscribers'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300"
                />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">Subscribers Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="targetAudience"
                  value="non-subscribers"
                  checked={targetAudience === 'non-subscribers'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300"
                />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">Non-Subscribers Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="targetAudience"
                  value="all"
                  checked={targetAudience === 'all'}
                  onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-zinc-300"
                />
                <span className="text-sm text-zinc-600 group-hover:text-zinc-900 transition-colors">All Users</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="userSelect" className="block text-sm font-semibold text-zinc-700">
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
                  setTimeout(() => setShowDropdown(false), 200);
                }}
                placeholder="Search by email or name..."
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
              />
              {showDropdown && users.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                  {(searchQuery === '' ? users : filteredUsers).slice(0, 100).map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedUser(user.id);
                        setSearchQuery(user.email || '');
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-zinc-50 border-b border-zinc-50 last:border-0 ${selectedUser === user.id ? 'bg-blue-50 text-blue-900' : 'text-zinc-700'
                        }`}
                    >
                      <div className="font-medium">{user.email}</div>
                      {(user.first_name || user.last_name) && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {user.first_name} {user.last_name}
                        </div>
                      )}
                    </button>
                  ))}
                  {searchQuery === '' && users.length > 100 && (
                    <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-100 bg-zinc-50">
                      Showing first 100 of {users.length} users. Type to search specifically.
                    </div>
                  )}
                  {searchQuery && filteredUsers.length === 0 && (
                    <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                      No users found.
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedUser && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 font-medium">
                Selected: {users.find(u => u.id === selectedUser)?.email}
              </div>
            )}
            {loadingUsers && (
              <div className="text-sm text-zinc-500 animate-pulse">Loading users...</div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-semibold text-zinc-700">
            Email Subject
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter email subject..."
            className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="content" className="block text-sm font-semibold text-zinc-700">
              Email Content
            </label>
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {preview ? 'Edit Source' : 'Show Preview'}
            </button>
          </div>
          {preview ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 whitespace-pre-wrap min-h-[200px]">
              {content ? <div dangerouslySetInnerHTML={{ __html: content }} /> : <span className="text-zinc-400 italic">No content to preview</span>}
            </div>
          ) : (
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter email content (HTML supported)..."
              rows={12}
              className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono shadow-sm transition-all"
            />
          )}
          <p className="text-xs text-zinc-500">
            HTML formatting is supported. Content will be wrapped in a standard template.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSend}
            disabled={loading || !subject.trim() || !content.trim() || (mode === 'single' && !selectedUser)}
            className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
            className="rounded-lg border border-zinc-200 bg-white px-6 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {mode === 'bulk' && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-start gap-2">
            <span className="text-lg leading-none">⚠️</span>
            <div>
              <strong className="font-semibold text-amber-900 block mb-0.5">Warning</strong>
              This will send an email to {targetAudience === 'subscribers' ? 'all active subscribers' : targetAudience === 'non-subscribers' ? 'all non-subscribers' : 'all users'}. Please verify your content before sending.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

