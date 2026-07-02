"use client";

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

interface PongalStatus {
  hasSubscription: boolean;
  downloadsUsed: number;
  downloadsAvailable: number;
  weekNumber: number;
  expiresAt: string | null;
  nextWeekReset?: string;
  daysUntilReset?: number;
  expired?: boolean;
  weeklyLimit?: number;
  currentWeekPaid?: boolean;
  autopayEnabled?: boolean;
  paymentRequired?: boolean;
  paymentMessage?: string | null;
}

export default function PongalProgressBar() {
  const [status, setStatus] = useState<PongalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/pongal-weekly/status', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const json = await res.json();
        if (json.ok) {
          setStatus(json);
        }
      } catch (error) {
        console.error('Failed to fetch Pongal status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every minute
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !status || !status.hasSubscription || status.expired) {
    return null;
  }

  const weeklyLimit = status.weeklyLimit || 3;
  const progress = (status.downloadsUsed / weeklyLimit) * 100;
  const isLimitReached = status.downloadsAvailable === 0;
  const paymentRequired = status.paymentRequired === true;
  const currentWeekPaid = status.currentWeekPaid !== false;

  return (
    <div className={`w-full rounded-lg border-2 p-4 mb-4 shadow-sm ${paymentRequired
        ? 'bg-red-50 border-red-300'
        : 'bg-white border-amber-200'
      }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-900">Pongal Weekly Offer</span>
          <span className={`text-xs px-2 py-1 rounded border ${paymentRequired
              ? 'text-red-700 bg-red-100 border-red-300'
              : 'text-amber-700 bg-gradient-to-r from-yellow-50 to-amber-50 border-amber-200'
            }`}>Week {status.weekNumber}/3</span>
          {!status.autopayEnabled && status.weekNumber < 3 && (
            <span className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded border border-orange-300">
              ⚠️ Autopay Off
            </span>
          )}
        </div>
        <div className="text-sm font-semibold text-zinc-900">
          {paymentRequired ? (
            <span className="text-red-600">Payment Required</span>
          ) : (
            `${status.downloadsAvailable} / ${weeklyLimit} downloads available`
          )}
        </div>
      </div>

      <div className="w-full bg-zinc-100 rounded-full h-2.5 mb-2">
        <div
          className={`h-2.5 rounded-full transition-all ${paymentRequired
              ? 'bg-red-500'
              : isLimitReached
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500'
            }`}
          style={{ width: paymentRequired ? '100%' : `${progress}%` }}
        />
      </div>

      {paymentRequired ? (
        <div className="text-xs text-red-600 font-medium">
          <p className="mb-1">
            {status.paymentMessage || 'Your weekly payment is pending. Please enable autopay to continue downloading.'}
          </p>
          {!status.autopayEnabled && (
            <a href="/dashboard" className="text-red-700 underline hover:text-red-800">
              Enable autopay to continue →
            </a>
          )}
        </div>
      ) : isLimitReached ? (
        <p className="text-xs text-red-600 font-medium">
          {status.daysUntilReset && status.daysUntilReset > 0
            ? `You reached your limit. Your credits will reset in ${status.daysUntilReset} day${status.daysUntilReset > 1 ? 's' : ''}. Check next week.`
            : 'You reached your limit. Your credits will reset next week. Check next week.'}
        </p>
      ) : (
        <p className="text-xs text-zinc-600">
          {status.downloadsAvailable} download{status.downloadsAvailable !== 1 ? 's' : ''} remaining this week
          {!status.autopayEnabled && status.weekNumber < 3 && (
            <span className="text-orange-600 ml-2">
              • Enable autopay for week {status.weekNumber + 1}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
