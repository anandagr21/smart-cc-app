# Product Launch Strategy — Smart CC App ("Card Optimiser")

**Version**: 1.0.6 | **Date**: July 4, 2026 | **Status**: Pre-Launch

---

## Context

The smart-cc-app (branded "Card Optimiser", v1.0.6) directly addresses the pain point from the r/CreditCardsIndia thread: users own 5-15 credit cards and struggle to remember which card to use for each purchase category. The OP explicitly validated the problem — "An Excel sheet needs constant updates whenever reward rules, caps, or offers changed."

This document consolidates: (A) previously recommended changes from [REDDIT_INSIGHTS.md](../REDDIT_INSIGHTS.md) with resolution status, (B) completed platform features, and (C) the remaining launch runway.

---

## A. Reddit-Informed Changes — Resolution Status

### Landing Page Changes (from [LANDING_PAGE_RECOMMENDATIONS.md](LANDING_PAGE_RECOMMENDATIONS.md))

| ID | Change | File | Status |
|----|--------|------|--------|
| **LP-1** | Rewrite Hero: "Which card for Swiggy? Fuel? Amazon? Stop guessing." | `Hero.tsx` | ✅ **RESOLVED** (a18be4b) |
| **LP-2** | Real Indian examples: Swiggy (₹600, 1%→10%), Fuel (₹2,000, 1%→7.5%), Fee Waiver with deadline | `ProductProof.tsx` | ✅ **RESOLVED** (a18be4b) |
| **LP-3** | Inclusive copy: "Whether you carry 2 cards or 12" (was "power users who carry 5+ cards") | `Features.tsx` | ✅ **RESOLVED** (a18be4b) |
| **LP-4** | Rename Step 2: "Set Spend Targets" → "Track Fee Waivers" with urgency language | `HowItWorks.tsx` | ✅ **RESOLVED** (a18be4b) |
| **LP-5** | Hero stats: Replace "2 min Setup time" with "Auto Rule updates" | `Hero.tsx` | ✅ **RESOLVED** (a18be4b) |
| **LP-6** | Add "Why Not Excel?" side-by-side comparison | `HowItWorks.tsx` | ✅ **RESOLVED** (a18be4b) |
| — | Ticker strip: name-drop Reddit-relevant cards (HSBC Live+, IDFC Power Plus, Scapia, Kiwi, etc.) | `App.tsx` | ✅ **RESOLVED** (a18be4b) |
| — | CTA headline: "Which card should you use for tonight's Swiggy order?" | `CTA.tsx` | ✅ **RESOLVED** (a18be4b) |
| — | Footer: "AI-powered credit card optimization for every Indian cardholder" | `Footer.tsx` | ✅ **RESOLVED** (a18be4b) |
| — | Meta description: "Which card for Swiggy? Fuel? Amazon?" | `index.html` | ✅ **RESOLVED** (a18be4b) |
| — | Social proof bar: "Trusted by 2,000+ Indian cardholders" with category→card→savings | `App.tsx` | ✅ **RESOLVED** (a18be4b) |

### App Changes (from REDDIT_INSIGHTS.md)

| ID | Change | Files | Status |
|----|--------|-------|--------|
| **APP-1** | Empty Dashboard: Category shortcut chips [Swiggy] [Amazon] [Fuel] [Zomato] | `EmptyDashboardState.tsx` | ✅ **RESOLVED** (0a4e1c0) |
| **APP-2** | Dashboard: "Quick Cheat Sheet" — best card per category, glanceable. "YOUR BEST PAIRINGS" section. | `app/(tabs)/index.tsx` | ✅ **RESOLVED** (0a4e1c0) |
| **APP-3** | Onboarding: Persona selection (Simplify / Maximize Rewards / Avoid Fees) | `OnboardingSlide.tsx` | ✅ **RESOLVED** (7473cee) |
| **APP-4** | Transaction form: Merchant quick-select chips below input | `SearchSection.tsx` | ✅ **RESOLVED** (0a4e1c0) |
| **APP-5** | Dashboard: Fee waiver urgency card with remaining spend + months | `app/(tabs)/index.tsx` | ✅ **RESOLVED** (0a4e1c0) |
| — | Dashboard empty state: "add first card" prompt | `app/(tabs)/index.tsx` | ✅ **RESOLVED** (33aeca9) |
| — | Dashboard action UI reorder | `app/(tabs)/index.tsx` | ✅ **RESOLVED** (ecee182) |

### P2 Items — NOT YET RESOLVED

| # | Idea | Rationale | Status |
|---|------|-----------|--------|
| P2-1 | **RuPay/UPI callout** on landing page | Indian-specific credibility signal | 🔲 Not started |
| P2-2 | **Shareable "Card Cheatsheet" export** | Generate one-page summary users can screenshot/save/share | 🔲 Not started |
| P2-3 | **Rule change notifications** | "HDFC updated reward rates on Infinia. Your recommendations recalculated." | 🔲 Not started |
| P2-4 | **Portfolio gap analysis** | "You're missing a fuel card. IDFC Power Plus would save you ₹X/year." | 🔲 Not started |
| P2-5 | **Gift voucher strategy support** | Model "bought Amazon voucher via Amex Gold → earned points" | 🔲 Not started |
| P2-6 | **UPI payment mode** | Explicit UPI support in transaction form | 🟡 Partially done — Data layer ready (DB enum, constants, frontend types). UI exposure in `TransactionForm` pending. |
| P2-7 | **Social proof / testimonial section** | Anonymized savings stories in category→card format | 🔲 Partially done (social proof bar exists, no detailed testimonials) |
| P2-8 | **Card name-drop in Features** | Mention Infinia, Amex, HSBC Live+ in feature descriptions | 🔲 Not started |

---

## B. Completed Platform Features

### Backend (18 route modules, all mounted under `/api/v1`)

- [x] **Auth** — JWT + refresh token rotation, Google OAuth, rate limiting
- [x] **Cards** — User wallet CRUD + master catalog (79 cards, 20+ banks)
- [x] **Transactions** — CRUD with optimization tracking, used-card override
- [x] **Recommendations** — Multi-carrier card recommendation engine
- [x] **Reward Engine** — Deterministic cashback/points/caps/exclusions computation
- [x] **Merchants** — Resolution, normalization, aliases, LLM matching
- [x] **Insights** — AI-generated spend insights with dismissal tracking
- [x] **Monthly Intelligence** — Optimization summaries, forecasting, trend detection
- [x] **Portfolio Evolution** — Health scoring, value density, strategy reflection
- [x] **Fee Waiver** — Projections, explainability, scoring
- [x] **Milestones** — Milestone evaluation engine
- [x] **Behavioral Memory** — Drift analysis, confidence modeling
- [x] **Adaptive Intelligence** — Personalization, coaching narratives, adoption tracking
- [x] **AI Agents** — Chat, recommendation, statement parser, ingestion pipeline
- [x] **Search** — Autocomplete, merchant search, alias learning
- [x] **Notifications**, **Feedback**, **Personality**, **Waitlist**
- [x] **Admin** — Ingestion pipeline, card intelligence review, feedback review
- [x] **Security** — Regression test suite, error sanitization, SQL injection prevention

### Frontend (React Native / Expo SDK 56)

- [x] **Onboarding** — Multi-step flow with persona selection on 4th slide
- [x] **Dashboard** — Empty states, quick-start chips, best pairings cheat sheet, fee waiver alerts
- [x] **Wallet Management** — Add/edit/delete cards, annual fee, spend tracking, fee cycles
- [x] **Transaction Form** — Merchant search with quick-select chips, card selector, recommendation banner
- [x] **Card Detail** — Sheets, card catalog browsing
- [x] **Transaction History** — Search and history
- [x] **Profile/Settings** — Notifications, preferences, security
- [x] **Monthly Intelligence** — Reports with forecasting
- [x] **Portfolio Evolution** — Tracking
- [x] **Recommendations** — UI with explainability
- [x] **Personality**, **Theme** (dark/light), **Feedback**

### Infrastructure

- [x] **Landing page** with waitlist (Cloudflare Pages) — Reddit-informed copy
- [x] **CI/CD** — GitHub Actions (backend Lambda, frontend Expo, landing page)
- [x] **Expo OTA updates** via expo-updates
- [x] **SEO** — Canonical URLs, structured data, sitemap, robots.txt
- [x] **Pitch deck**
- [x] **Research documentation** (REDDIT_INSIGHTS.md, LANDING_PAGE_RECOMMENDATIONS.md)
- [x] **Database migrations** via Alembic (7 migrations)
- [x] **Docker Compose** for local dev
- [x] **Sentry crash reporting** — Backend (`sentry-sdk` in `main.py`, breadcrumbs in orchestrator/evaluator/admin) + Frontend (`@sentry/react-native/expo` in `app.json`, API error capture in `services/api/client.ts`)

---

## C. Pending Tasks — Launch Runway

### 🔴 Pre-Launch (Next 2 Weeks)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 1 | **App Store listings**: iOS App Store (screenshots, description, keywords) + Google Play Store | 🔴 High | 🔲 Pending |
| 2 | **Beta distribution**: TestFlight (iOS) + Play Console internal track (Android) | 🔴 High | 🔲 Pending |
| 3 | **Analytics setup**: PostHog/Mixpanel for funnel tracking — channel attribution, activation rate, retention | 🔴 High | 🔲 Pending |
| 4 | **Crash reporting verification**: Confirm Sentry is configured for frontend + backend in production | 🔴 High | ✅ **RESOLVED** — Sentry fully integrated backend (`main.py`, breadcrumbs in orchestrator/evaluator/admin) + frontend (`app.json`, API error capture) |
| 5 | **Push notifications**: Set up Expo push notification service for time-sensitive card offers | 🔴 High | 🔲 Pending |
| 6 | **Community seeding**: DM 5-10 top commenters from the Reddit thread for beta access | 🟡 Medium | 🔲 Pending |
| 7 | **Card data accuracy audit**: Verify reward rates, caps, exclusions for top 50 Indian credit cards | 🟡 Medium | 🔲 Pending |
| 8 | **Landing page → app download funnel**: Track waitlist → install conversion | 🟢 Low | 🔲 Pending |

### 🟡 Launch Phase (Weeks 3-6)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 9 | **r/CreditCardsIndia launch post**: "I built the Excel sheet that updates itself" with demo | 🔴 High | 🔲 Pending |
| 10 | **Product Hunt launch**: India-friendly timing, coordinate beta users for upvotes | 🟡 Medium | 🔲 Pending |
| 11 | **YouTube creator outreach**: 2-3 Indian fintech/credit card YouTubers for review | 🟡 Medium | 🔲 Pending |
| 12 | **Onboarding A/B test**: Track drop-off per step, test simplified 2-step flow for Simplifiers | 🟢 Low | 🔲 Pending |

### 🟢 Post-Launch / Growth (Weeks 7-16)

| # | Task | Priority | Status |
|---|------|----------|--------|
| 13 | **Reward rule freshness pipeline**: Hire/assign daily monitoring of bank reward changes. Target: 24-hr update SLA | 🔴 High | 🔲 Pending |
| 14 | **Community correction system**: User flagging of outdated rules → gamified leaderboard | 🟡 Medium | 🟡 **Partially resolved** — Feedback submission API (`feedback.py` router, `FeedbackService.create_feedback()`) and admin review dashboard (`app/admin/feedback.tsx`) are built. Gamified leaderboard not yet implemented. |
| 15 | **Card affiliate integration**: Apply-through-app affiliate links for revenue | 🟡 Medium | 🔲 Pending |
| 16 | **Premium tier**: Pro features — spending analytics, "what-if" scenarios, multi-card milestone tracking | 🟡 Medium | 🔲 Pending |
| 17 | **Merchant offers aggregation**: Bank-specific offers surfaced at point of recommendation | 🟢 Low | 🔲 Pending |
| 18 | **Wallet Showdown sharing feature**: Generate shareable card strategy image for social media | 🟢 Low | 🔲 Pending |
| 19 | **Rule change notifications**: "HDFC updated Infinia reward rates. Your recommendations recalculated." | 🟢 Low | 🔲 Pending |
| 20 | **Portfolio gap analysis**: "You're missing a fuel card. IDFC Power Plus would save you ₹X/year." | 🟢 Low | 🔲 Pending |
| 21 | **Gift voucher / wallet load strategy support**: Model advanced tactics as transaction types | 🟢 Low | 🔲 Pending |
| 22 | **UPI payment mode**: Explicit UPI support in transaction form | 🟢 Low | 🟡 **Partially resolved** — UPI is a valid `PaymentMode` enum in the DB (Alembic migration), transaction constants, and frontend `transaction.types.ts`. Just needs explicit UI exposure in `TransactionForm`. |
| 23 | **Shareable cheatsheet export**: One-page screenshot-ready summary | 🟢 Low | 🔲 Pending |

---

## Messaging Framework

| Persona | Hook | Promise |
|---------|------|---------|
| **Optimizer** (8-15 cards) | "Is your Infinia earning 12% or 5% on this Amazon order?" | Never leave rewards on the table |
| **Simplifier** (2-3 cards) | "2 cards, max rewards, zero thinking" | Earn more without the headache |
| **Newcomer** | "Your first card strategy, personalized" | Don't collect pokemon — collect rewards |

---

## Key Risks

1. **Reward data staleness**: If app recommends a card with outdated rules → trust destroyed instantly. Mitigation: 24-hr update SLA + user flagging + rule change notifications.
2. **Bank pushback**: Banks may resist reward arbitrage. Mitigation: Frame as "card discovery," not bank avoidance.
3. **Monetization timing**: Affiliate revenue needs scale. Mitigation: Keep burn low, bootstrap for 12-18 months.
4. **UPI credit card fragmentation**: Merchant acceptance varies. Mitigation: Don't over-invest until ecosystem stabilizes (Reddit data confirms mixed UPI reality).

---

## Verification

Before launch, validate:
1. DM 5-10 thread commenters → show app concept → record feedback
2. Post poll on r/CreditCardsIndia: "Would you use an app for this?"
3. Waitlist → app download conversion rate from Reddit traffic
4. End-to-end test: install app → add 3 cards → get recommendation → verify accuracy
5. Load test the recommendation API at 100 concurrent users
