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
    const { subject, content } = body;

    if (!subject || !content) {
      return NextResponse.json({ ok: false, error: 'Subject and content are required' }, { status: 400 });
    }

    // Get all active subscription users
    const { data: subscriptions, error: subError } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('is_active', true);

    if (subError) {
      return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'No active subscribers found',
        sent: 0 
      });
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Send email to each subscriber
    for (const userId of userIds) {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(userId);
        if (!userData || !userData.user) {
          console.error(`User data not found for user ${userId}`);
          failCount++;
          continue;
        }
        
        const userEmail = userData.user.email;
        const userName = userData.user.email?.split('@')[0] || 'User';

        if (userEmail) {
          await sendMarketingEmail(userEmail, userName, subject, content);
          successCount++;
        }
      } catch (emailError: any) {
        console.error(`Failed to send marketing email to user ${userId}:`, emailError);
        failCount++;
        errors.push(`User ${userId}: ${emailError.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Marketing email sent to ${successCount} subscribers`,
      sent: successCount,
      failed: failCount,
      total: userIds.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error('Error sending marketing emails:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

