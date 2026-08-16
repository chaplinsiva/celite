<!-- agent-notes: { ctx: "Live Traffic & All-Visitor Activity Logs Plan", deps: ["visitor_touchpoints", "app/api/admin/analytics/live-traffic/route.ts", "app/admin/components/LiveTrafficLogsPanel.tsx"], state: active, last: "pat@2026-08-16" } -->
# Live Traffic & All-Visitor Activity Logs Analysis Plan

## 1. Goal
Provide real-time visibility into all website traffic, views, anonymous sessions, and signups by marketing source with a dedicated admin tab (**"📡 Live Traffic Logs"**) and full-funnel conversion analysis.

## 2. Key Capabilities
1. **Live Traffic Event Stream**: Real-time table logging every page view, product view, signup, and checkout attempt.
2. **Anonymous vs Authenticated Traffic**: Track views from anonymous users vs logged-in users.
3. **Signups by Source**: Dedicated report mapping each registered user account back to their initial discovery source and campaign.
4. **Full Funnel Analysis**: Conversion tracking from `Views → Product Views → Signups → Checkouts → Subscriptions`.
5. **Interactive Controls**: Auto-refresh toggle (every 30s), filters for event types, sources, devices, and search.

## 3. Architecture & Implementation Steps
- Step 1: Write TDD test suite `__tests__/live-traffic-analytics.test.ts`.
- Step 2: Build `app/api/admin/analytics/live-traffic/route.ts` aggregating `visitor_touchpoints` with user profiles.
- Step 3: Build `app/admin/components/LiveTrafficLogsPanel.tsx`.
- Step 4: Add `liveTrafficLogs` to `app/admin/components/AdminSidebar.tsx` and `app/admin/AdminClient.tsx`.
- Step 5: Validate test suite and TypeScript compilation.
