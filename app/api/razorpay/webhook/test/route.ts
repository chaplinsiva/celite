import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Test endpoint to verify webhook functionality
 * This endpoint can be used to test webhook signature generation
 * 
 * Usage:
 * 1. Get your webhook secret from Razorpay Dashboard
 * 2. Send a POST request with test data
 * 3. This will show you how to generate the correct signature
 * 
 * Note: This is for testing purposes only. In production, use Razorpay's test webhooks.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { test_data, webhook_secret } = body;

    if (!webhook_secret) {
      return NextResponse.json({ 
        error: 'Missing webhook_secret',
        instruction: 'Provide your Razorpay webhook secret to test signature generation'
      }, { status: 400 });
    }

    if (!test_data) {
      return NextResponse.json({ 
        error: 'Missing test_data',
        instruction: 'Provide test webhook payload data'
      }, { status: 400 });
    }

    // Generate signature (same as Razorpay does)
    const bodyString = typeof test_data === 'string' ? test_data : JSON.stringify(test_data);
    const signature = crypto
      .createHmac('sha256', webhook_secret)
      .update(bodyString)
      .digest('hex');

    return NextResponse.json({
      success: true,
      message: 'Signature generated successfully',
      signature,
      instructions: {
        step1: 'Copy this signature',
        step2: `Send a POST request to: https://celite.netlify.app/api/razorpay/webhook`,
        step3: `Include header: x-razorpay-signature: ${signature}`,
        step4: `Send body as: ${typeof test_data === 'string' ? test_data : JSON.stringify(test_data)}`,
      },
      curl_example: `curl -X POST https://celite.netlify.app/api/razorpay/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-razorpay-signature: ${signature}" \\
  -d '${typeof test_data === 'string' ? test_data : JSON.stringify(test_data)}'`
    });
  } catch (e: any) {
    return NextResponse.json({ 
      error: e?.message || 'Test endpoint error',
      details: 'Make sure test_data is valid JSON'
    }, { status: 500 });
  }
}

/**
 * GET endpoint to show test instructions
 */
export async function GET() {
  return NextResponse.json({
    message: 'Webhook Test Endpoint',
    usage: {
      method: 'POST',
      url: '/api/razorpay/webhook/test',
      body: {
        webhook_secret: 'your_razorpay_webhook_secret',
        test_data: {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_test123',
                order_id: 'order_test123',
                notes: {
                  user_id: 'test_user_id'
                }
              }
            }
          }
        }
      }
    },
    example_curl: `curl -X POST https://celite.netlify.app/api/razorpay/webhook/test \\
  -H "Content-Type: application/json" \\
  -d '{
    "webhook_secret": "your_secret",
    "test_data": {
      "event": "payment.captured",
      "payload": {
        "payment": {
          "entity": {
            "id": "pay_test123",
            "order_id": "order_test123",
            "notes": {"user_id": "test_user_id"}
          }
        }
      }
    }
  }'`,
    note: 'This endpoint helps you generate the correct signature for testing. Use it to verify your webhook secret is correct.'
  });
}

