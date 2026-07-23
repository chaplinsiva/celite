import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { sendMarketingEmail } from '../../../../../lib/emailService';

export async function POST(req: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
    
    if (!token) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: userRes, error: authError } = await admin.auth.getUser(token);
    if (authError || !userRes.user) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminCheck } = await admin
      .from('admins')
      .select('user_id')
      .eq('user_id', userRes.user.id)
      .maybeSingle();

    if (!adminCheck) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { subject, content, targetAudience = 'subscribers' } = body;

    if (!subject || !content) {
      return NextResponse.json({ ok: false, error: 'Subject and content are required' }, { status: 400 });
    }

    // Get all users from users_view
    const { data: allUsersData, error: usersError } = await admin
      .from('users_view')
      .select('id,email,raw_user_meta_data');

    if (usersError) {
      return NextResponse.json({ ok: false, error: usersError.message }, { status: 500 });
    }

    // Get active subscription user IDs
    const { data: subscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('is_active', true);

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    const subscriberIds = new Set((subscriptions || []).map(s => s.user_id));

    // Filter user IDs based on target audience
    let targetUsers: any[] = [];
    
    if (targetAudience === 'subscribers') {
      targetUsers = (allUsersData || []).filter(u => subscriberIds.has(u.id));
    } else if (targetAudience === 'non-subscribers') {
      targetUsers = (allUsersData || []).filter(u => !subscriberIds.has(u.id));
    } else if (targetAudience === 'all') {
      targetUsers = allUsersData || [];
    } else {
      return NextResponse.json({ ok: false, error: 'Invalid target audience' }, { status: 400 });
    }

    if (targetUsers.length === 0) {
      const audienceText = targetAudience === 'subscribers' ? 'subscribers' : targetAudience === 'non-subscribers' ? 'non-subscribers' : 'users';
      return NextResponse.json({ 
        ok: true, 
        message: `No ${audienceText} found`,
        sent: 0 
      });
    }
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send email to each target user
    for (const u of targetUsers) {
      try {
        const userEmail = u.email;
        const meta = u.raw_user_meta_data || {};
        const userName = meta.full_name || meta.name || 
          (meta.first_name ? `${meta.first_name} ${meta.last_name || ''}`.trim() : '') ||
          (userEmail ? userEmail.split('@')[0] : 'User');

        if (userEmail) {
          await sendMarketingEmail(userEmail, userName, subject, content);
          successCount++;
        } else {
          failCount++;
        }
      } catch (emailError: any) {
        console.error(`Failed to send marketing email to user ${u.id}:`, emailError);
        failCount++;
        errors.push(`User ${u.id}: ${emailError.message}`);
      }
    }

    const audienceText = targetAudience === 'subscribers' ? 'subscribers' : targetAudience === 'non-subscribers' ? 'non-subscribers' : 'users';
    return NextResponse.json({
      ok: true,
      message: `Marketing email sent to ${successCount} ${audienceText}`,
      sent: successCount,
      failed: failCount,
      total: targetUsers.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error('Error sending marketing emails:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

