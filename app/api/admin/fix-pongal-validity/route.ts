import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { razorpayRequest } from '../../../../lib/razorpay';

/**
 * Admin endpoint to fix Pongal weekly subscribers whose autopay payments 
 * were deducted but validity was not extended.
 * 
 * This script:
 * 1. Finds all active pongal_weekly subscriptions
 * 2. Checks Razorpay payment history for each subscription
 * 3. Calculates correct validity based on weeks paid
 * 4. Updates subscriptions with incorrect validity
 */
export async function POST(req: Request) {
    try {
        const admin = getSupabaseAdminClient();

        // Check if user is admin
        const auth = req.headers.get('authorization') || '';
        const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;
        if (!token) {
            return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { data: { user }, error: userError } = await admin.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
        }

        // Check if user is admin
        const { data: adminCheck } = await admin
            .from('admins')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!adminCheck) {
            return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
        }

        // Get all active pongal_weekly subscriptions
        const { data: subscriptions, error: subError } = await admin
            .from('subscriptions')
            .select('user_id, plan, valid_until, razorpay_subscription_id, is_active, autopay_enabled, created_at, updated_at')
            .eq('is_active', true)
            .eq('plan', 'pongal_weekly');

        if (subError) {
            return NextResponse.json({ ok: false, error: subError.message }, { status: 500 });
        }

        if (!subscriptions || subscriptions.length === 0) {
            return NextResponse.json({
                ok: true,
                message: 'No active pongal_weekly subscriptions found',
                fixed: [],
                errors: []
            });
        }

        const fixed: Array<{ user_id: string; old_valid_until: string; new_valid_until: string; reason: string }> = [];
        const errors: Array<{ user_id: string; error: string }> = [];
        const skipped: Array<{ user_id: string; reason: string }> = [];

        console.log(`Checking ${subscriptions.length} pongal_weekly subscriptions...`);

        for (const sub of subscriptions) {
            try {
                const userId = sub.user_id as string;
                const razorpaySubscriptionId = sub.razorpay_subscription_id as string | null;
                const currentValidUntil = sub.valid_until ? new Date(sub.valid_until) : null;
                const subscriptionCreatedAt = sub.created_at ? new Date(sub.created_at) : null;

                // Get pongal weekly subscription details
                const { data: pongalSub } = await admin
                    .from('pongal_weekly_subscriptions')
                    .select('*')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (!pongalSub) {
                    skipped.push({ user_id: userId, reason: 'No pongal_weekly_subscriptions record found' });
                    continue;
                }

                // Calculate weeks paid based on week_paid columns
                let weeksPaid = 1; // Week 1 is always paid (initial payment)
                if (pongalSub.week2_paid === true) weeksPaid = 2;
                if (pongalSub.week3_paid === true) weeksPaid = 3;

                // Calculate expected valid_until based on weeks paid
                // Start from week_start_date and add 7 days per week paid
                const weekStartDate = new Date(pongalSub.week_start_date);
                const expectedValidUntil = new Date(weekStartDate);
                expectedValidUntil.setDate(expectedValidUntil.getDate() + (weeksPaid * 7));

                // If Razorpay subscription exists, try to get payment count from Razorpay
                if (razorpaySubscriptionId) {
                    try {
                        const razorpaySub = await razorpayRequest(`/subscriptions/${razorpaySubscriptionId}`, {
                            method: 'GET',
                        });

                        // Razorpay's paid_count tells us how many successful payments were made
                        const paidCount = razorpaySub.paid_count || 1;

                        if (paidCount > weeksPaid) {
                            // Razorpay shows more payments than we tracked - user was charged but not updated
                            const razorpayBasedWeeks = Math.min(paidCount, 3);
                            const razorpayExpectedValidUntil = new Date(weekStartDate);
                            razorpayExpectedValidUntil.setDate(razorpayExpectedValidUntil.getDate() + (razorpayBasedWeeks * 7));

                            if (!currentValidUntil || currentValidUntil < razorpayExpectedValidUntil) {
                                // Update subscription validity
                                const { error: updateError } = await admin
                                    .from('subscriptions')
                                    .update({
                                        valid_until: razorpayExpectedValidUntil.toISOString(),
                                        updated_at: new Date().toISOString(),
                                    })
                                    .eq('user_id', userId);

                                if (updateError) {
                                    errors.push({ user_id: userId, error: `Database update error: ${updateError.message}` });
                                } else {
                                    // Also update the pongal_weekly_subscriptions record
                                    const weekUpdateData: any = { updated_at: new Date().toISOString() };
                                    if (razorpayBasedWeeks >= 2) {
                                        weekUpdateData.week2_paid = true;
                                        weekUpdateData.week2_paid_at = weekUpdateData.week2_paid_at || new Date().toISOString();
                                    }
                                    if (razorpayBasedWeeks >= 3) {
                                        weekUpdateData.week3_paid = true;
                                        weekUpdateData.week3_paid_at = weekUpdateData.week3_paid_at || new Date().toISOString();
                                    }
                                    weekUpdateData.current_week_paid = true;

                                    await admin
                                        .from('pongal_weekly_subscriptions')
                                        .update(weekUpdateData)
                                        .eq('id', pongalSub.id);

                                    fixed.push({
                                        user_id: userId,
                                        old_valid_until: currentValidUntil?.toISOString() || 'null',
                                        new_valid_until: razorpayExpectedValidUntil.toISOString(),
                                        reason: `Razorpay shows ${paidCount} payments, updated to week ${razorpayBasedWeeks}`,
                                    });
                                    console.log(`Fixed pongal subscription for user ${userId}: ${currentValidUntil?.toISOString() || 'null'} -> ${razorpayExpectedValidUntil.toISOString()}`);
                                }
                            } else {
                                skipped.push({ user_id: userId, reason: 'Validity already correct based on Razorpay data' });
                            }
                        } else {
                            skipped.push({ user_id: userId, reason: `Razorpay paid_count (${paidCount}) matches tracked weeks (${weeksPaid})` });
                        }
                    } catch (razorpayError: any) {
                        // Razorpay API error - fall back to local data check
                        console.warn(`Razorpay API error for user ${userId}:`, razorpayError?.message);

                        // Check if local validity seems incorrect
                        if (currentValidUntil && expectedValidUntil > currentValidUntil) {
                            const { error: updateError } = await admin
                                .from('subscriptions')
                                .update({
                                    valid_until: expectedValidUntil.toISOString(),
                                    updated_at: new Date().toISOString(),
                                })
                                .eq('user_id', userId);

                            if (updateError) {
                                errors.push({ user_id: userId, error: `Database update error: ${updateError.message}` });
                            } else {
                                fixed.push({
                                    user_id: userId,
                                    old_valid_until: currentValidUntil.toISOString(),
                                    new_valid_until: expectedValidUntil.toISOString(),
                                    reason: `Fixed based on local week tracking (${weeksPaid} weeks paid)`,
                                });
                            }
                        } else {
                            skipped.push({ user_id: userId, reason: 'Validity appears correct based on local tracking' });
                        }
                    }
                } else {
                    // No Razorpay subscription ID - fix based on local data only
                    if (currentValidUntil && expectedValidUntil > currentValidUntil) {
                        const { error: updateError } = await admin
                            .from('subscriptions')
                            .update({
                                valid_until: expectedValidUntil.toISOString(),
                                updated_at: new Date().toISOString(),
                            })
                            .eq('user_id', userId);

                        if (updateError) {
                            errors.push({ user_id: userId, error: `Database update error: ${updateError.message}` });
                        } else {
                            fixed.push({
                                user_id: userId,
                                old_valid_until: currentValidUntil.toISOString(),
                                new_valid_until: expectedValidUntil.toISOString(),
                                reason: `Fixed based on local week tracking (${weeksPaid} weeks paid, no Razorpay ID)`,
                            });
                        }
                    } else {
                        skipped.push({ user_id: userId, reason: 'No Razorpay ID, validity appears correct' });
                    }
                }
            } catch (e: any) {
                errors.push({
                    user_id: sub.user_id as string,
                    error: e?.message || 'Unknown error processing subscription'
                });
            }
        }

        return NextResponse.json({
            ok: true,
            message: `Processed ${subscriptions.length} pongal_weekly subscriptions`,
            fixed: fixed.length,
            errors: errors.length,
            skipped: skipped.length,
            details: {
                fixed,
                errors,
                skipped,
            },
        });
    } catch (e: any) {
        console.error('Fix pongal validity error:', e);
        return NextResponse.json({ ok: false, error: e?.message || 'Unknown error' }, { status: 500 });
    }
}
