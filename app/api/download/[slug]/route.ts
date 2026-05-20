import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

/**
 * Extract file extension from a path or filename
 */
function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '.zip'; // Default to .zip if no extension
  return path.substring(lastDot);
}

/**
 * Get filename from R2 key path (last part after /)
 */
function getFilenameFromKey(key: string): string {
  const parts = key.split('/');
  return parts[parts.length - 1] || 'file.zip';
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  let slug: string = 'unknown';
  try {
    const params = await context.params;
    slug = params.slug;
    const admin = getSupabaseAdminClient();

    // Check authentication
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    const userId = userRes.user.id;

    // Get template from database
    const { data: template, error: templateErr } = await admin
      .from('templates')
      .select('slug, name, source_path, is_free')
      .eq('slug', slug)
      .maybeSingle();

    if (templateErr || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check subscription (skip for free templates)
    const { data: sub } = await admin
      .from('subscriptions')
      .select('id, is_active, valid_until, plan, autopay_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    const active = !!sub?.is_active && (!sub?.valid_until || new Date(sub.valid_until as any).getTime() > Date.now());
    const isFreeTemplate = template?.is_free === true;

    if (!active && !isFreeTemplate) {
      return NextResponse.json({ error: 'Access denied. Please subscribe to download.' }, { status: 403 });
    }

    // Check pongal_weekly download limits
    if (sub?.plan === 'pongal_weekly' && !isFreeTemplate) {
      // Get settings for download limits
      const { data: settings } = await admin.from('settings').select('key,value');
      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((row: any) => { settingsMap[row.key] = row.value; });
      const weeklyLimit = Number(settingsMap.PONGAL_WEEKLY_DOWNLOADS_PER_WEEK || '3');

      const { data: pongalSub } = await admin
        .from('pongal_weekly_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_id', sub.id)
        .maybeSingle();

      if (!pongalSub) {
        return NextResponse.json({ error: 'Pongal subscription not found.' }, { status: 403 });
      }

      // Get tracking record
      const { data: tracking } = await admin
        .from('pongal_tracking')
        .select('*')
        .eq('user_id', userId)
        .eq('subscription_id', sub.id)
        .maybeSingle();

      // Check if subscription has expired
      const expiresAt = new Date(pongalSub.expires_at).getTime();
      if (Date.now() > expiresAt) {
        // Update tracking
        if (tracking) {
          await admin
            .from('pongal_tracking')
            .update({
              subscription_status: 'expired',
              autopay_status: 'expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', tracking.id);
        }
        return NextResponse.json({ error: 'Your Pongal subscription has expired.' }, { status: 403 });
      }

      // Check if we need to reset for a new week
      const currentWeekStart = new Date(pongalSub.current_week_start).getTime();
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      let downloadsUsed = pongalSub.downloads_used;
      let weekNumber = pongalSub.week_number;
      let newWeekStart = new Date(pongalSub.current_week_start);
      let currentWeekPaid = pongalSub.current_week_paid ?? true;

      // If a new week has started, check payment and reset downloads
      if (now - currentWeekStart >= weekInMs) {
        // Calculate which week we're in
        const weeksElapsed = Math.floor((now - new Date(pongalSub.week_start_date).getTime()) / weekInMs);
        weekNumber = Math.min(weeksElapsed + 1, 3);

        // Check if payment for this week has been made
        // Week 1 is always paid (initial payment), Week 2 and 3 require autopay
        if (weekNumber === 2) {
          currentWeekPaid = pongalSub.week2_paid === true;
        } else if (weekNumber === 3) {
          currentWeekPaid = pongalSub.week3_paid === true;
        } else {
          currentWeekPaid = pongalSub.week1_paid === true;
        }

        // Reset downloads for new week
        downloadsUsed = 0;
        newWeekStart = new Date(Math.floor(now / weekInMs) * weekInMs); // Start of current week

        // Update both tables with payment status
        await admin
          .from('pongal_weekly_subscriptions')
          .update({
            downloads_used: 0,
            week_number: weekNumber,
            current_week_start: newWeekStart.toISOString(),
            current_week_paid: currentWeekPaid,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pongalSub.id);

        // Update tracking
        if (tracking) {
          await admin
            .from('pongal_tracking')
            .update({
              downloads_this_week: 0,
              current_week_number: weekNumber,
              subscription_weeks_remaining: Math.max(0, 3 - weekNumber + 1),
              current_week_paid: currentWeekPaid,
              updated_at: new Date().toISOString(),
            })
            .eq('id', tracking.id);
        }
      }

      // Check if autopay is enabled (required for weeks 2 and 3)
      const autopayEnabled = sub.autopay_enabled === true;

      // For weeks 2 and 3, verify payment has been received
      if (weekNumber >= 2) {
        // Check if current week payment received
        if (!currentWeekPaid) {
          // Update tracking
          if (tracking) {
            await admin
              .from('pongal_tracking')
              .update({
                payment_status: `week${weekNumber}_payment_pending`,
                subscription_status: 'payment_required',
                updated_at: new Date().toISOString(),
              })
              .eq('id', tracking.id);
          }

          return NextResponse.json({
            error: 'Payment required for this week.',
            paymentRequired: true,
            message: autopayEnabled
              ? 'Your weekly payment is being processed. Please try again shortly.'
              : 'Your autopay is disabled. Please enable autopay or make a manual payment to continue downloading.',
            weekNumber,
            expired: true,
          }, { status: 403 });
        }

        // Check if autopay is off - block downloads if no payment for upcoming weeks
        if (!autopayEnabled && weekNumber < 3) {
          // Check if next week's payment will fail
          await admin
            .from('pongal_tracking')
            .update({
              autopay_status: 'disabled_by_user',
              updated_at: new Date().toISOString(),
            })
            .eq('id', tracking?.id);
        }
      }

      // Check download limit
      if (downloadsUsed >= weeklyLimit) {
        // Calculate next week reset time
        const nextWeekStart = new Date(newWeekStart.getTime() + weekInMs);
        const daysUntilReset = Math.ceil((nextWeekStart.getTime() - now) / (24 * 60 * 60 * 1000));

        // Update tracking - limit reached
        if (tracking) {
          await admin
            .from('pongal_tracking')
            .update({
              limit_reached_count: (tracking.limit_reached_count || 0) + 1,
              last_limit_reached_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', tracking.id);
        }

        return NextResponse.json({
          error: 'You have reached your weekly download limit.',
          limitReached: true,
          message: daysUntilReset > 0
            ? `Your credits will reset in ${daysUntilReset} day${daysUntilReset > 1 ? 's' : ''}. Check next week.`
            : 'Your credits will reset next week. Check next week.',
          downloadsUsed: weeklyLimit,
          downloadsAvailable: 0,
        }, { status: 403 });
      }
    }

    const sourcePath = template.source_path;
    if (!sourcePath || typeof sourcePath !== 'string' || sourcePath.trim() === '') {
      console.error(`[Download] Template ${slug} has no source_path`);
      return NextResponse.json({ error: 'Source file not available for this template' }, { status: 404 });
    }

    console.log(`[Download] Template ${slug} source_path: ${sourcePath.substring(0, 100)}...`);

    // Check if source_path is a full URL (legacy support - redirect to external URL)
    const isFullUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');

    if (isFullUrl) {
      // Legacy: For external URLs, redirect (but record download first)
      try {
        const subscriptionId = sub?.id || null;
        await admin.from('downloads').insert({
          user_id: userId,
          template_slug: slug,
          downloaded_at: new Date().toISOString(),
          ...(subscriptionId && { subscription_id: subscriptionId }),
        });
      } catch (err) {
        console.error('Failed to record download:', err);
      }

      // Return redirect for legacy URLs
      return NextResponse.json({ redirect: true, url: sourcePath });
    }

    // New R2 system: Generate signed URL for direct download
    // This avoids loading large files into memory
    let signedUrl: string;
    let filename: string;

    try {
      console.log(`[Download] Generating signed URL for template ${slug}, key: ${sourcePath}`);

      // Import the signed URL function
      const { getSignedSourceUrl } = await import('../../../../lib/r2Client');

      // Generate signed URL (expires in 5 minutes)
      signedUrl = await getSignedSourceUrl(sourcePath, 300);

      console.log(`[Download] Signed URL generated successfully for ${slug}`);

      // Extract filename from R2 key or use slug with detected extension
      const keyFilename = getFilenameFromKey(sourcePath);
      const ext = getFileExtension(keyFilename);
      filename = `${slug}${ext}`;
    } catch (r2Error: any) {
      console.error(`[Download] R2 signed URL error for ${slug}:`, r2Error);
      console.error(`[Download] Error details:`, {
        message: r2Error?.message,
        name: r2Error?.name,
        code: r2Error?.code,
        stack: r2Error?.stack,
      });

      // Handle specific R2 errors
      if (r2Error?.name === 'NoSuchKey' || r2Error?.message?.includes('not found') || r2Error?.message?.includes('NoSuchKey')) {
        return NextResponse.json({ error: 'Source file not found in storage' }, { status: 404 });
      }

      if (r2Error?.name === 'NoSuchBucket' || r2Error?.message?.includes('bucket')) {
        return NextResponse.json({ error: 'Storage bucket not configured. Please contact support.' }, { status: 500 });
      }

      if (r2Error?.message?.includes('credentials') || r2Error?.message?.includes('Access')) {
        return NextResponse.json({ error: 'Storage authentication failed. Please contact support.' }, { status: 500 });
      }

      return NextResponse.json({
        error: 'Failed to generate download link. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? r2Error?.message : undefined
      }, { status: 500 });
    }

    // Record download BEFORE returning the signed URL
    try {
      console.log(`[Download] Recording download for template: ${slug}, user: ${userId}, isFree: ${isFreeTemplate}`);

      if (isFreeTemplate) {
        // For free templates, use the free_downloads table (no subscription required)
        const freeDownloadRecord = {
          user_id: userId,
          template_slug: slug,
          downloaded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        const { error: downloadErr } = await admin.from('free_downloads').insert(freeDownloadRecord);

        if (downloadErr) {
          console.error('[Download] Failed to record free download:', downloadErr);
          console.error('[Download] Free download record was:', freeDownloadRecord);
        } else {
          console.log(`[Download] ✅ Free download recorded successfully for user ${userId}, template ${slug}`);
        }
      } else {
        // For paid templates, use the downloads table (requires subscription)
        const subscriptionId = sub?.id || null;
        const downloadRecord: any = {
          user_id: userId,
          template_slug: slug,
          downloaded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

        if (subscriptionId) {
          downloadRecord.subscription_id = subscriptionId;
        }

        const { error: downloadErr } = await admin.from('downloads').insert(downloadRecord);

        if (downloadErr) {
          console.error('[Download] Failed to record paid download:', downloadErr);
          console.error('[Download] Download record was:', downloadRecord);
        } else {
          console.log(`[Download] ✅ Paid download recorded successfully for user ${userId}, template ${slug}`);

          // Update pongal_weekly download count if applicable
          if (sub?.plan === 'pongal_weekly') {
            const { data: pongalSub } = await admin
              .from('pongal_weekly_subscriptions')
              .select('downloads_used, id')
              .eq('user_id', userId)
              .eq('subscription_id', subscriptionId)
              .maybeSingle();

            if (pongalSub) {
              const newDownloadCount = (pongalSub.downloads_used || 0) + 1;

              // Update pongal_weekly_subscriptions
              await admin
                .from('pongal_weekly_subscriptions')
                .update({
                  downloads_used: newDownloadCount,
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('subscription_id', subscriptionId);

              // Update comprehensive tracking table
              const { data: tracking } = await admin
                .from('pongal_tracking')
                .select('*')
                .eq('user_id', userId)
                .eq('subscription_id', subscriptionId)
                .maybeSingle();

              if (tracking) {
                await admin
                  .from('pongal_tracking')
                  .update({
                    download_count: (tracking.download_count || 0) + 1,
                    downloads_this_week: newDownloadCount,
                    last_download_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', tracking.id);
              }
            }
          }
        }
      }
    } catch (downloadErr: any) {
      console.error('[Download] Failed to record download (exception):', downloadErr);
      // Continue with download even if recording fails
    }

    // Return signed URL for direct browser download
    // The client will redirect to this URL for actual download
    return NextResponse.json({
      redirect: true,
      url: signedUrl,
      filename: filename
    });
  } catch (e: any) {
    const errorSlug = slug || 'unknown';
    console.error(`[Download] Unexpected error for ${errorSlug}:`, e);
    console.error(`[Download] Error stack:`, e?.stack);
    return NextResponse.json({
      error: e?.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? e?.stack : undefined
    }, { status: 500 });
  }
}


