import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../../lib/supabaseAdmin';
import { sendEmail } from '../../../../../lib/emailService';

// Generate beautifully designed product alert email HTML
function generateProductAlertEmail(
    userName: string,
    templateName: string,
    templateSubtitle: string | null,
    templateDescription: string | null,
    thumbnailUrl: string | null,
    productUrl: string,
    categoryName: string
): { subject: string; html: string } {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app';
    const logoUrl = `${siteUrl}/logo/logo.png`;

    // Use a placeholder gradient if no thumbnail
    const thumbnailSection = thumbnailUrl
        ? `<img src="${thumbnailUrl}" alt="${templateName}" style="width: 100%; height: auto; border-radius: 12px; display: block; max-height: 300px; object-fit: cover;" />`
        : `<div style="width: 100%; height: 200px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
        <span style="color: white; font-size: 48px;">🎨</span>
       </div>`;

    const subject = `🎉 New Template Alert: ${templateName} is Now Available!`;

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5; line-height: 1.6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px 40px; text-align: center;">
                  <img src="${logoUrl}" alt="Celite" style="height: 40px; width: auto;" onerror="this.style.display='none'" />
                  <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 20px 0 0 0; letter-spacing: -0.5px;">
                    🎉 New Template Alert!
                  </h1>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Greeting -->
                  <p style="color: #3f3f46; font-size: 16px; margin: 0 0 20px 0;">
                    Hi <strong>${userName}</strong>,
                  </p>
                  <p style="color: #52525b; font-size: 15px; margin: 0 0 30px 0;">
                    We're excited to let you know about a brand new template that just dropped on Celite! Check it out below:
                  </p>

                  <!-- Thumbnail Card -->
                  <div style="background: linear-gradient(145deg, #fafafa 0%, #f4f4f5 100%); border-radius: 16px; padding: 20px; margin-bottom: 30px; border: 1px solid #e4e4e7;">
                    <!-- Category Badge -->
                    <div style="margin-bottom: 15px;">
                      <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 12px; border-radius: 20px; display: inline-block;">
                        ${categoryName}
                      </span>
                    </div>

                    <!-- Thumbnail -->
                    <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden;">
                      ${thumbnailSection}
                    </div>

                    <!-- Title & Description -->
                    <h2 style="color: #18181b; font-size: 22px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.3px;">
                      ${templateName}
                    </h2>
                    ${templateSubtitle ? `<p style="color: #71717a; font-size: 14px; font-weight: 500; margin: 0 0 12px 0;">${templateSubtitle}</p>` : ''}
                    ${templateDescription ? `<p style="color: #52525b; font-size: 14px; margin: 0; line-height: 1.6;">${templateDescription.substring(0, 200)}${templateDescription.length > 200 ? '...' : ''}</p>` : ''}
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin-bottom: 30px;">
                    <a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                      🚀 View & Download Template
                    </a>
                  </div>

                  <!-- Features Highlight -->
                  <div style="background: #fefce8; border-radius: 12px; padding: 20px; border: 1px solid #fef08a; margin-bottom: 20px;">
                    <p style="color: #854d0e; font-size: 14px; font-weight: 600; margin: 0 0 10px 0;">✨ As a subscriber, you get:</p>
                    <ul style="color: #713f12; font-size: 13px; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 6px;">Unlimited downloads</li>
                      <li style="margin-bottom: 6px;">Full source files</li>
                      <li style="margin-bottom: 6px;">Commercial license included</li>
                      <li>Priority support</li>
                    </ul>
                  </div>

                  <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0;">
                    You're receiving this email because you're a valued Celite subscriber.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background: #fafafa; padding: 30px 40px; text-align: center; border-top: 1px solid #e4e4e7;">
                  <p style="color: #71717a; font-size: 12px; margin: 0 0 10px 0;">
                    © ${new Date().getFullYear()} Celite Inc. All rights reserved.
                  </p>
                  <div style="margin-top: 15px;">
                    <a href="${siteUrl}" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Visit Website</a>
                    <a href="${siteUrl}/dashboard" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Dashboard</a>
                    <a href="${siteUrl}/pricing" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Manage Subscription</a>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

    return { subject, html };
}

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
        const { templateSlug } = body;

        if (!templateSlug) {
            return NextResponse.json({ ok: false, error: 'Template slug is required' }, { status: 400 });
        }

        // Get template details
        const { data: template, error: templateError } = await admin
            .from('templates')
            .select('slug, name, subtitle, description, thumbnail_path, img, category:categories(name, slug)')
            .eq('slug', templateSlug)
            .maybeSingle();

        if (templateError || !template) {
            return NextResponse.json({ ok: false, error: 'Template not found' }, { status: 404 });
        }

        // Get all active subscribers
        const { data: subscriptions, error: subError } = await admin
            .from('subscriptions')
            .select('user_id')
            .eq('is_active', true);

        if (subError) {
            return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
        }

        const subscriberIds = (subscriptions || []).map(s => s.user_id);

        if (subscriberIds.length === 0) {
            return NextResponse.json({
                ok: true,
                message: 'No active subscribers found',
                sent: 0,
                failed: 0,
                total: 0
            });
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://celite.netlify.app';
        const productUrl = `${siteUrl}/product/${template.slug}`;
        const thumbnailUrl = template.thumbnail_path || template.img || null;
        const categoryName = (template.category as any)?.name || 'Templates';

        let successCount = 0;
        let failCount = 0;
        const errors: string[] = [];

        // Send email to each subscriber
        for (const userId of subscriberIds) {
            try {
                const { data: userData } = await admin.auth.admin.getUserById(userId);
                if (!userData || !userData.user) {
                    console.error(`User data not found for user ${userId}`);
                    failCount++;
                    continue;
                }

                const userEmail = userData.user.email;
                const userName = userData.user.user_metadata?.first_name ||
                    userData.user.email?.split('@')[0] ||
                    'Subscriber';

                if (userEmail) {
                    const { subject, html } = generateProductAlertEmail(
                        userName,
                        template.name,
                        template.subtitle,
                        template.description,
                        thumbnailUrl,
                        productUrl,
                        categoryName
                    );

                    await sendEmail(userEmail, subject, html);
                    successCount++;
                }
            } catch (emailError: any) {
                console.error(`Failed to send product alert email to user ${userId}:`, emailError);
                failCount++;
                errors.push(`User ${userId}: ${emailError.message}`);
            }
        }

        return NextResponse.json({
            ok: true,
            message: `Product alert sent to ${successCount} subscribers`,
            sent: successCount,
            failed: failCount,
            total: subscriberIds.length,
            templateName: template.name,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (e: any) {
        console.error('Error sending product alert emails:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    }
}
