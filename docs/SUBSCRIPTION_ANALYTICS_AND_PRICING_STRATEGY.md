# Celite Subscription Analytics & Pricing Strategy Document

> **Document Version:** 1.1  
> **Date:** July 23, 2026  
> **Target System:** Celite Digital Assets Marketplace (`celite`)  
> **Database:** Live PostgreSQL Instance (Supabase `rmrdchkemlhseriqjgit`)

---

## 1. Executive Summary

This document presents a comprehensive data analysis of Celite's subscription user base, monthly template download patterns, multi-month retention metrics, and an empirical impact evaluation for introducing a **₹499 / 10-download limit monthly tier** alongside our existing **₹799 unlimited plan**.

---

## 2. Current Platform Overview & Subscription Metrics

Based on live database queries:

| Metric | Overall Value |
| :--- | :--- |
| **Total Subscribed Users** | **152 users** |
| **Total Downloads by Subscribed Users** | **2,502 downloads** |
| **Overall Average Downloads per Subscribed User** | **16.46 downloads / user** |
| **Total System Downloads (All Users)** | **2,506 downloads** |
| **Subscribed User Share of Total Downloads** | **99.8%** |

### Breakdown by Subscription Plan & Active Status

| Plan | Status | User Count | Total Downloads | Avg Downloads / User |
| :--- | :--- | :---: | :---: | :---: |
| **Monthly** | Active | 127 | 2,168 | **17.07** |
| **Yearly** | Active | 1 | 199 | **199.00** |
| **Pongal Weekly** | Active | 14 | 28 | **2.00** |
| **Monthly** | Inactive / Expired | 8 | 101 | **12.63** |
| **Pongal Weekly** | Inactive / Expired | 2 | 6 | **3.00** |

---

## 3. June vs July Strategy Experiment Comparison

In **June 2026**, Celite ran the standard **₹799 Unlimited plan with no free templates**.  
In **July 2026**, Celite introduced the **₹499 Unlimited plan with select free templates, plus fully free Music & SFX assets**.

### Side-by-Side Performance Comparison

| Metric | June 2026 (₹799 Plan, No Free Assets) | July 2026 MTD (₹499 Plan + Free Assets) | Change / Impact |
| :--- | :---: | :---: | :---: |
| **New Subscriptions** | 19 users | **26 users** (23 days) | 🟢 **+36.8% growth** *(Projected ~35, +84%)* |
| **Active Downloaders** | 27 users | **38 users** | 🟢 **+40.7% growth** in user activity |
| **Total Downloads** | 495 downloads | **480 downloads** (23 days) | 🟢 Pacing to **~650 downloads** (+31%) |
| **Avg Downloads / Active User** | 18.33 | **12.63** | 🔵 Broader, more balanced download base |
| **MoM User Retention Rate** | 26.7% *(May -> Jun)* | 🟢 **44.4%** *(Jun -> Jul)* | 🟢 **Highest retention rate of 2026** |

### Historical Month-over-Month Retention Trend

```
  April -> May Retention:  ████████████ 40.0% (6 / 15 users)
  May   -> June Retention: ████████ 26.7% (8 / 30 users)
  June  -> July Retention: ██████████████ 44.4% (12 / 27 users)  <-- NEW STRATEGY RECORD
```

---

## 4. Monthly Subscriber Per-User Breakdown

Focusing specifically on **Monthly Plan Subscribers** (135 total users: 127 active, 8 inactive):

- **Total Monthly Downloads:** 2,269 downloads
- **Average Downloads per Monthly User:** 16.81 downloads / user

### Download Volume Tiers (Monthly Users)

| Download Volume Tier | User Count | % of Monthly Users | User Characteristics |
| :--- | :---: | :---: | :--- |
| **Heavy Users** (> 50 downloads) | 14 users | **10.4%** | Agencies, production houses, daily creators |
| **Moderate Users** (20 – 50 downloads) | 22 users | **16.3%** | Active freelancers, busy editors |
| **Regular Users** (1 – 19 downloads) | 88 users | **65.2%** | Casual editors, occasional project builders |
| **Zero / Inactive Downloads** | 11 users | **8.1%** | Registered subscribers with 0 downloads |

### Top 20 Monthly Subscribers by Download Volume

| Rank | User Email | Status | Subscription Start | Downloads |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `creativeteam.demosindia@gmail.com` | Active | Jan 31, 2026 | **114** |
| 2 | `pawankmo6666@gmail.com` | Active | Mar 22, 2026 | **109** |
| 3 | `nandhubenn99@gmail.com` | Active | May 29, 2026 | **107** |
| 4 | `heyimbarathy@gmail.com` | Active | Feb 15, 2026 | **99** |
| 5 | `ronsamuelpeter9791@gmail.com` | Active | Jan 28, 2026 | **97** |
| 6 | `mail2ragavreads@gmail.com` | Active | Jun 11, 2026 | **91** |
| 7 | `prabhustudio4@gmail.com` | Active | Jun 01, 2026 | **77** |
| 8 | `ramadmediaofficial@gmail.com` | Active | Feb 24, 2026 | **70** |
| 9 | `ckbala421@gmail.com` | Active | Jan 19, 2026 | **70** |
| 10 | `mahebalu.balu3@gmail.com` | Active | May 26, 2026 | **60** |
| 11 | `racingstudio36@gmail.com` | Active | Jul 02, 2026 | **51** |
| 12 | `zoroedtz23@gmail.com` | Inactive | Feb 12, 2026 | **51** |
| 13 | `ebenezer.vfx@gmail.com` | Active | Jan 15, 2026 | **51** |
| 14 | `balajiarjun3111@gmail.com` | Active | Feb 05, 2026 | **51** |
| 15 | `iamabbas73@gmail.com` | Active | May 20, 2026 | **49** |
| 16 | `vidiyalphotography2025@gmail.com` | Active | Jun 22, 2026 | **42** |
| 17 | `ssnaveenkumarwrks@gmail.com` | Active | Jun 24, 2026 | **39** |
| 18 | `gracedesigner304@gmail.com` | Active | Jun 29, 2026 | **38** |
| 19 | `shanyustarness21@gmail.com` | Active | Feb 09, 2026 | **35** |
| 20 | `businessdesigner42@gmail.com` | Active | Feb 16, 2026 | **34** |

---

## 5. Multi-Month Retention Cohort Analysis

Retained users are defined as subscribers who actively downloaded templates across **2 or more distinct calendar months**.

- **Total Retained Monthly Users:** **43 users**
- **Monthly Retention Rate:** **31.8%** of total monthly subscribers (43 / 135)
- **Average Downloads per Retained User:** **32.5 downloads** (vs 8.5 for single-month users)

### Longest Retained Monthly Subscribers (3+ Months Active)

| User Email | Months Active | Active Month Period | Total Downloads | Status |
| :--- | :---: | :--- | :---: | :---: |
| `shanyustarness21@gmail.com` | **4 Months** | Feb, Mar, Apr, May 2026 | **35** | Active |
| `devacinemaspkt@gmail.com` | **4 Months** | Jan, Feb, Apr, May 2026 | **26** | Active |
| `thinneshms@gmail.com` | **3 Months** | Apr, Jun, Jul 2026 | **33** | Active |

---

## 6. Impact Analysis: Proposed ₹499 (10-Download Limit) Plan

### Catalog Context
- **Catalog Size:** ~1,000 templates (Video, Motion, SFX, Graphics, 3D, Web).

### Historical Monthly Usage vs 10-Download Cap

Analysis of **197 user-download months** across historical activity:

| Monthly Download Bucket | Share of User-Months | Impact of 10-Download Limit |
| :--- | :---: | :--- |
| **1 – 10 downloads** | **69.5%** (137 months) | **Zero negative impact.** Fits comfortably within 10 downloads. |
| **11 – 25 downloads** | **16.8%** (33 months) | **Mild friction.** Reaches cap near end of month. |
| **26 – 50 downloads** | **7.6%** (15 months) | **Moderate friction.** Needs higher allocation. |
| **> 50 downloads** | **6.1%** (12 months) | **High friction.** Power agencies requiring unlimited access. |

### Key Findings & Trade-Offs

1. **Lower Acquisition Friction (Price reduction to ₹499)**:
   - **70% of current users** consume 10 or fewer templates per month. Reducing the entry price to ₹499 will significantly lower the barrier for new users, boosting signup conversion rates.
2. **Perceived Value**:
   - At ₹499 for 10 templates, the effective cost per download is **₹49.90**. Considering standalone templates sell for ₹199–₹499 each, ₹499/mo for 10 downloads represents exceptional value.
3. **Abuse Prevention**:
   - A 10-download limit protects Cloudflare R2 egress costs and prevents automated bulk scraping of our 1,000 template library.

---

## 7. Strategic Recommendation: Dual Tiered Pricing Model

Rather than replacing unlimited access completely with a single 10-download ₹499 plan, adopt a **2-Tiered Subscription Architecture**:

```
+------------------------------------+      +------------------------------------+
|       STARTER PLAN — ₹499/mo       |      |        PRO PLAN — ₹799/mo          |
+------------------------------------+      +------------------------------------+
| * 10 Downloads per month           |      | * Unlimited Downloads              |
| * Access to 1,000+ template library|      | * Access to 1,000+ template library|
| * Standard Download Speed          |      | * High Priority Support            |
| * Ideal for Casual Creators        |      | * Ideal for Agencies & Studios     |
+------------------------------------+      +------------------------------------+
```

### Strategic Benefits:
- **Captures Budget Market**: Converts price-conscious buyers at ₹499.
- **Protects High-Value Revenue**: Retains power users (30.5% of active base) on the ₹799 Unlimited tier.
- **Smooth Upgrade Funnel**: Automatically prompts ₹499 users who reach their 10-download limit to upgrade to the ₹799 Pro tier.
