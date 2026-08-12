// agent-notes: { ctx: "Test script verifying creator payout calculations and deduction logic", deps: ["lib/payouts.ts"], state: active, last: "sato@2026-08-12" }

import { calculateCreatorPayoutBalance } from "../lib/payouts";

// Mock Supabase client for unit testing
function createMockSupabase(earnings: any[], payouts: any[]) {
  return {
    from: (table: string) => {
      return {
        select: (fields: string) => {
          return {
            eq: (field: string, value: string) => {
              if (table === "creator_earnings") {
                return Promise.resolve({ data: earnings, error: null });
              }
              if (table === "creator_payout_requests") {
                return Promise.resolve({ data: payouts, error: null });
              }
              return Promise.resolve({ data: [], error: null });
            },
          };
        },
      };
    },
  } as any;
}

async function runTests() {
  console.log("🧪 Running Creator Payout Deduction Unit Tests...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Basic Gross Earnings and No Payouts
  {
    const mockEarnings = [
      { creator_earning: 800, earning_type: "marketplace" },
      { creator_earning: 200, earning_type: "subscription" },
    ];
    const mockPayouts: any[] = [];
    const mockClient = createMockSupabase(mockEarnings, mockPayouts);

    const result = await calculateCreatorPayoutBalance(mockClient, "shop-1");
    assert(result.marketplaceSales === 800, "Marketplace sales equals 800");
    assert(result.subscriptionRevenue === 200, "Subscription revenue equals 200");
    assert(result.grossEarnings === 1000, "Gross earnings equals 1000");
    assert(result.paidPayouts === 0, "Paid payouts equals 0");
    assert(result.pendingPayouts === 0, "Pending payouts equals 0");
    assert(result.totalDeductions === 0, "Total deductions equals 0");
    assert(result.availableBalance === 1000, "Available balance equals 1000");
  }

  // Test 2: Paid Payouts and Pending Payouts Deduct Immediately
  {
    const mockEarnings = [
      { creator_earning: 1600, earning_type: "marketplace" }, // 80% of ₹2000
      { creator_earning: 400, earning_type: "subscription" },
    ];
    const mockPayouts = [
      { amount: 500, status: "paid" },
      { amount: 300, status: "pending" }, // Pending payout must deduct immediately!
      { amount: 200, status: "rejected" }, // Rejected payout must NOT deduct
    ];
    const mockClient = createMockSupabase(mockEarnings, mockPayouts);

    const result = await calculateCreatorPayoutBalance(mockClient, "shop-2");
    assert(result.grossEarnings === 2000, "Gross earnings equals 2000");
    assert(result.paidPayouts === 500, "Paid payouts equals 500");
    assert(result.pendingPayouts === 300, "Pending payouts equals 300");
    assert(result.totalDeductions === 800, "Total deductions equals 800 (500 paid + 300 pending)");
    assert(result.availableBalance === 1200, "Available balance equals 1200 (2000 - 800)");
  }

  // Test 3: Deductions Exceeding Gross Earnings Floor at Zero
  {
    const mockEarnings = [{ creator_earning: 100, earning_type: "marketplace" }];
    const mockPayouts = [
      { amount: 100, status: "paid" },
      { amount: 50, status: "pending" },
    ];
    const mockClient = createMockSupabase(mockEarnings, mockPayouts);

    const result = await calculateCreatorPayoutBalance(mockClient, "shop-3");
    assert(result.totalDeductions === 150, "Total deductions equals 150");
    assert(result.availableBalance === 0, "Available balance is floored at 0 using Max(0, Gross - Deductions)");
  }

  console.log(`\n📊 Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
