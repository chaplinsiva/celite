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
    const { subject, content, userId } = body;

    if (!subject || !content || !userId) {
      return NextResponse.json({ ok: false, error: 'Subject, content, and userId are required' }, { status: 400 });
    }

    // Get user data
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
    if (userError || !userData || !userData.user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    const userEmail = userData.user.email;
    if (!userEmail) {
      return NextResponse.json({ ok: false, error: 'User email not found' }, { status: 400 });
    }

    const userName = userEmail.split('@')[0] || 'User';

    // Send email
    try {
      await sendMarketingEmail(userEmail, userName, subject, content);
      return NextResponse.json({
        ok: true,
        message: `Email sent successfully to ${userEmail}`,
        sent: 1,
      });
    } catch (emailError: any) {
      console.error('Failed to send email:', emailError);
      return NextResponse.json({ 
        ok: false, 
        error: emailError.message || 'Failed to send email' 
      }, { status: 500 });
    }
  } catch (e: any) {
    console.error('Error sending single user email:', e);
    return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}

