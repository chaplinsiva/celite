---
agent-notes: { ctx: "MCP database-driven received vs expected monthly revenue plan", deps: ["app/admin/components/MonthlyAnalysisTab.tsx", "app/api/admin/analytics/monthly/route.ts"], state: active, last: "sato@2026-08-13" }
---

# Plan: MCP Database-Driven Received vs Expected Monthly Analysis

## Goal
Enhance the Celite Monthly Analysis dashboard to display both **RECEIVED Revenue** (actual completed transactions) and **EXPECTED Revenue** (MRR / potential collection from active subscribers) for any selected month, alongside clear metrics for **Created Subscriptions** and **Updated Subscriptions** for Monthly and Yearly plans.

## MCP Supabase Verified Findings (`project_id: rmrdchkemlhseriqjgit`)

### 1. Active Platform Subscriptions (`subscriptions`)
- **Active Auto-Pay Monthly Subscribers**: 28 active (Expected: ₹22,372.00)
- **Active Manual Monthly Subscribers**: 22 active (Expected: ₹17,578.00)
- **Active Manual Yearly Subscribers**: 1 active (Expected: ₹5,499.00)
- **Total Active Subscribers**: **51 active subscribers**
- **Total Expected Monthly Revenue (MRR)**: **₹45,449.00** (40% Vendor: ₹18,179.60 | 60% Celite: ₹27,269.40)

### 2. Actual Received Payments in August 2026 (`checkout_details`)
- **Completed Auto-Pay Transactions**: 12 count (Received: ₹5,498.00)
- **Completed Manual Transactions**: 0 count (Received: ₹0.00)
- **Total Received Revenue (Aug 2026)**: **₹5,498.00** (40% Vendor: ₹2,199.20 | 60% Celite: ₹3,298.80)
- **Collection Progress**: ₹5,498.00 received of ₹45,449.00 expected (12.1% collected so far).

## Proposed Architecture & UI Layout

### API Layer (`/api/admin/analytics/monthly/route.ts`)
Return twin metric structures for selected month:
1. **`received`**:
   - `totalRevenue`: Sum of completed checkouts + orders in month (Aug: ₹5,498.00).
   - `monthlySubCount` & `monthlySubRevenue`: 12 count (₹5,498.00).
   - `yearlySubCount` & `yearlySubRevenue`: 0 count (₹0.00).
   - `autopayCount` & `autopayRevenue`: 12 count (₹5,498.00).
   - `manualCount` & `manualRevenue`: 0 count (₹0.00).
   - `vendorPool` (40%): ₹2,199.20.
   - `celiteShare` (60%): ₹3,298.80.
2. **`expected`**:
   - `totalRevenue`: Sum of MRR from all active subscribers (₹45,449.00).
   - `monthlySubCount` & `monthlySubRevenue`: 50 active (₹39,950.00).
   - `yearlySubCount` & `yearlySubRevenue`: 1 active (₹5,499.00).
   - `autopaySubscribers` & `autopayRevenue`: 28 active (₹22,372.00).
   - `manualSubscribers` & `manualRevenue`: 23 active (₹23,077.00).
   - `vendorPool` (40%): ₹18,179.60.
   - `celiteShare` (60%): ₹27,269.40.
   - `pendingCollection`: ₹39,951.00.
3. **`activity`**:
   - `createdCount`: New subscriptions created in month.
   - `updatedCount`: Existing subscriptions renewed/updated in month.

### UI Layer (`MonthlyAnalysisTab.tsx`)
- **Top Toggle / Tabs**: Switch view mode between **"Received Revenue (Actual Cash)"** and **"Expected Revenue (MRR / Full Month Potential)"** or view side-by-side comparison cards.
- **Card 1: Received Revenue**: ₹5,498.00 (12 Monthly payments).
- **Card 2: Expected Revenue**: ₹45,449.00 (51 Active Subscribers).
- **Card 3: Collection Rate**: 12.1% Collected (₹39,951 Pending).
- **Card 4: 40/60 Split**: Vendor Received ₹2,199.20 (Expected ₹18,179.60) | Celite Received ₹3,298.80 (Expected ₹27,269.40).
- **Subscribers Activity Card**: Created this month vs Updated this month breakdown for Monthly & Yearly plans.
