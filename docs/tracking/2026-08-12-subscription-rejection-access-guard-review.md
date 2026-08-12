---
agent-notes: { ctx: "tracking artifact for subscription rejection access guard review", deps: ["docs/code-reviews/2026-08-12-subscription-rejection-access-guard.md"], state: active, last: "grace@2026-08-12" }
---

# Tracking: Subscription Rejection Access Guard Fix — Review

**Date:** 2026-08-12  
**Phase:** Code Review  
**Prior Phase:** N/A (hotfix for production bug)

## Review Summary

| Severity | Count | Resolved |
|----------|-------|----------|
| Critical | 2 | 2 |
| Important | 3 | 2 |
| Suggestion | 3 | 0 |

## Key Issues Found

1. **[Critical/Fixed]** Product page permalink had no access guard for rejected templates — rejected celitemarket.in templates were still viewable on celite.in.
2. **[Critical/Fixed]** Default `?? true` for `available_on_celite_subscription` caused templates that never went through review to appear as subscription-approved.
3. **[Important/Fixed]** `generateMetadata()` leaked SEO metadata for rejected templates to search engines.
4. **[Important/Deferred]** Heavy `(row as any)` usage bypasses type safety — recommend generating Supabase types.

## Resolution

- All Critical and 2/3 Important issues resolved in this commit.
- Full review document: `docs/code-reviews/2026-08-12-subscription-rejection-access-guard.md`

## Verification

- `npx tsc --noEmit` — 0 errors
