---
agent-notes: { ctx: "Documentation for Google AdSense setup and fixes", deps: ["app/layout.tsx", "public/ads.txt"], state: active, last: "sato@2026-08-16" }
---

# Google AdSense Integration & Verification Documentation

## Overview
This document records the Google AdSense integration architecture, the issues identified during setup, and the complete fixes implemented on `celite.in`.

**Publisher ID**: `pub-5327132249014590` (`ca-pub-5327132249014590`)
**Target Domain**: `celite.in`

---

## Issues Identified & Solutions

### 1. `data-nscript` Console Error
- **Error**: `AdSense head tag doesn't support data-nscript attribute. (anonymous) @ adsbygoogle.js?client=ca-pub-5327132249014590:227`
- **Cause**: Next.js's `<Script>` component (`next/script`) injects internal runtime tracking attributes (`data-nscript="afterInteractive"`) directly onto script DOM nodes. Google AdSense’s loader script validates attributes strictly and flags unrecognized attributes.
- **Fix**: Replaced Next.js `<Script>` with a native HTML `<script>` tag directly inside the `<head>` in [app/layout.tsx](file:///d:/celite-main/celite-main/app/layout.tsx):
  ```tsx
  <script
    async
    src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5327132249014590"
    crossOrigin="anonymous"
  />
  ```

---

### 2. Missing `ads.txt` File
- **Error**: `Not found: No ads.txt file was found when the site was last crawled.`
- **Cause**: Google AdSense requires an IAB-standard `ads.txt` file at the root of the domain (`https://celite.in/ads.txt`) to authenticate the publisher account. The file was missing from `public/`.
- **Fix**: Created [public/ads.txt](file:///d:/celite-main/celite-main/public/ads.txt) containing the verified AdSense publisher record:
  ```text
  google.com, pub-5327132249014590, DIRECT, f08c47fec0942fa0
  ```
  In Next.js, static files in `/public` are automatically served at the root domain (`https://celite.in/ads.txt`).

---

### 3. Site Ownership Verification (`google-adsense-account` Meta Tag)
- **Requirement**: `<meta name="google-adsense-account" content="ca-pub-5327132249014590">`
- **Fix**: Added the meta tag to both the Next.js `metadata.other` configuration and directly into the `<head>` element in [app/layout.tsx](file:///d:/celite-main/celite-main/app/layout.tsx):
  ```tsx
  // In metadata export
  other: {
    'google-adsense-account': 'ca-pub-5327132249014590',
  }

  // In <head>
  <meta name="google-adsense-account" content="ca-pub-5327132249014590" />
  ```

---

## File Changes Summary

| File | Purpose |
|---|---|
| [app/layout.tsx](file:///d:/celite-main/celite-main/app/layout.tsx) | Added native AdSense `<script>` tag inside `<head>`, added `google-adsense-account` meta tag in `metadata.other` & `<head>`. |
| [public/ads.txt](file:///d:/celite-main/celite-main/public/ads.txt) | Created authorized seller declaration for Google AdSense. |

---

## Verification & Deployment
- **Git Branch**: `fix/adsense-script-tag`
- **Live URL Verification**:
  - `https://celite.in/ads.txt` returns `google.com, pub-5327132249014590, DIRECT, f08c47fec0942fa0` with HTTP 200.
  - `https://celite.in` contains the `<meta name="google-adsense-account">` and clean AdSense loader `<script>`.
