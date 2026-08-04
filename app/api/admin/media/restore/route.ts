/* agent-notes: { ctx: "API route for restoring template media assets", deps: ["lib/supabaseAdmin.ts"], state: active, last: "sato@2026-07-28" } */

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();

    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (token) {
      const { data: { user }, error: authErr } = await admin.auth.getUser(token);
      if (authErr || !user) {
        return NextResponse.json({ error: 'Unauthorized admin user' }, { status: 401 });
      }
      const { data: adminRow } = await admin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!adminRow) {
        return NextResponse.json({ error: 'Forbidden: User is not an admin' }, { status: 403 });
      }
    }

    const body = await req.json();
    const { slug, mediaType, originalUrl } = body;

    if (!slug || !mediaType) {
      return NextResponse.json({ error: 'Missing required parameters: slug, mediaType' }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {};
    if (originalUrl) {
      if (mediaType === 'video') {
        updatePayload.video_path = originalUrl;
      } else {
        updatePayload.thumbnail_path = originalUrl;
      }
    }

    const { error: updateErr } = await admin
      .from('templates')
      .update(updatePayload)
      .eq('slug', slug);

    if (updateErr) {
      console.error('Failed to restore original asset path:', updateErr);
      return NextResponse.json({ error: 'Failed to update database record for restore' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      slug,
      mediaType,
      restoredUrl: originalUrl || null,
      message: `Successfully restored original ${mediaType} asset`
    });
  } catch (error: any) {
    console.error('Media restore API error:', error);
    return NextResponse.json({ error: error?.message || 'Server error during media restore' }, { status: 500 });
  }
}
