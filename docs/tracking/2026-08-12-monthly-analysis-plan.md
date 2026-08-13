---
agent-notes: { ctx: "tracking artifact for received vs expected monthly analysis plan", deps: ["docs/plans/2026-08-12-monthly-analysis-plan.md"], state: active, last: "grace@2026-08-13" }
---

# Tracking: Received vs Expected Monthly Analysis Plan

**Date:** 2026-08-12
**Topic:** Twin Received & Expected Monthly Analysis in Celite Analytics
**Prior Phase:** None

## Goals
1. Provide dual metrics: **Received Revenue** (actual cash collected) vs **Expected Revenue** (MRR from 51 active subscribers).
2. Display clear breakdown of **Created Subscriptions** vs **Updated Subscriptions** for the selected month.
3. Compare Received (₹5,498.00) vs Expected (₹45,449.00) for August 2026.

## Key Constraints
- Query Supabase project `rmrdchkemlhseriqjgit` directly for active subscriber totals and completed checkout details.
- Support toggle/view between Received Cash and Expected Potential.
