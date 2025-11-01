import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    if (!token) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const admin = getSupabaseAdminClient();
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });

    const { first_name, last_name } = await req.json();
    
    // Get current user metadata
    const currentMetadata = user.user_metadata || {};
    
    // Update user metadata using admin client
    const { data: updatedUser, error } = await admin.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...currentMetadata,
        first_name: first_name || null,
        last_name: last_name || null,
      },
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('Profile update error:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

