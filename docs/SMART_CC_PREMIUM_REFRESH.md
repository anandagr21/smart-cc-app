# Smart CC — Premium Visual Refresh

**Audit date:** June 13, 2026  
**Current score:** 8.3/10  
**Target score:** 9.5/10  
**Auditor role:** Senior Staff Product Designer + Senior Mobile UX Architect  

---

## Table of Contents

1. [Screen-by-Screen Critique](#1-screen-by-screen-critique)
2. [Prioritized Improvements](#2-prioritized-improvements)
3. [Accessibility Findings (P0)](#3-accessibility-findings-p0)
4. [Onboarding Proposal (P0)](#4-onboarding-proposal-p0)
5. [Dashboard Clarity (P1)](#5-dashboard-clarity-p1)
6. [Profile Enrichment (P1)](#6-profile-enrichment-p1)
7. [Animation Audit — Full Classification](#7-animation-audit)
8. [Typography Findings](#8-typography-findings)
9. [Empty State Audit](#9-empty-state-audit)
10. [Charts & Delight Layer](#10-charts--delight-layer)
11. [Design System Improvements](#11-design-system-improvements)
12. [Detailed Implementation Plan](#12-detailed-implementation-plan)

---

## 1. Screen-by-Screen Critique

### 00 — Login Screen

**Current state:** `app/(auth)/login.tsx` (294 lines)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Visual hierarchy | 9/10 | Fingerprint → eyebrow → hero → subtext → form → CTAs. Clear weight descent. |
| Brand presence | 8/10 | Fingerprint icon in concentric ring is subtle. Could be stronger. |
| Form design | 8/10 | Card-variant form with elevated shadows. lgtm. |
| Typography | 7/10 | Hero at `display` (32px/heavy) is strong. Subtext at `bodyLg` crosses ~50 chars — one line too many. |
| Color | 6/10 | **P0 issue:** "or continue with" divider text uses `textMuted` (#A7B0C0, 2.4:1). Fails WCAG AA. |
| Motion | 8/10 | 3 staggered `FadeInDown` animations (50ms, 120ms, 200ms delays). Good rhythm. |
| Error handling | 7/10 | Inline form errors via Zod schema. **Gap:** No connectivity error banner (uses inline setError, which is correct but text-only). |
| Missing | — | No "Forgot password" link. No terms/privacy links (separate TermsDisclaimerModal handles terms on first load). |

**Score:** 7.5/10 → **Target:** 9/10

**Fixes:**
- **P0:** Fix `textMuted` color on divider line (see §3)
- **P1:** Add "Forgot password?" link below password field
- **P2:** Add subtle brand logo animation on mount (the fingerprint icon already enters — consider a subtle glow pulse on first render)
- **P2:** Shorten subtext to ~40 chars: "Connect your wallet. Unlock AI insights."

---

### 01 — Analyze Tab (Dashboard)

**Current state:** `app/(tabs)/index.tsx` (337 lines)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Greeting | 9/10 | Dynamic "Good morning/afternoon/evening · Smart CC". Personal, contextual. |
| Hero typography | 8/10 | `heroXl` (60px/heavy) "Dashboard" — powerful anchoring. |
| Stats cards | 7/10 | Two stat cards (Opt. Score + Rewards) with animated numbers. **Issue:** "Opt. Score" abbreviation is unclear. |
| Best Category | 8/10 | Full-width card with success badge. Clean. |
| Recommendation card | 9/10 | Lightbulb icon + color-coded badge + title + summary. This is the hero. |
| CTA | 9/10 | "Add Transaction" is prominent, full-width, primary button in soft-purple container. Excellent visual weight. |
| Empty state | 6/10 | When no stats exist, the dashboard collapses to just the CTA + empty recommendation area. Feels broken. |
| Spacing | 9/10 | Consistent 12px card gaps, 32px section gaps, 8px element gaps. |
| Motion | 9/10 | 4 staggered entries (header 50ms, stats 100ms, rec 150ms, CTA 250ms). Excellent rhythm. |
| Ambient orbs | 10/10 | The `ScreenContainer` adds two large blurred orbs (primary top-right, accent bottom-left). This is a signature detail — do NOT remove. |

**Score:** 8.5/10 → **Target:** 9.5/10

**Fixes:**
- **P1:** Rename "Opt. Score" to "Reward Efficiency" (see §5)
- **P2:** Add empty-state dashboard variant that still shows the CTA prominently + educational content
- **P2:** Add a subtle pull-to-refresh (currently no RefreshControl on dashboard)
- **P3:** Add a "Last updated" timestamp near the greeting

---

### 02 — Wallet Tab

**Current state:** `app/(tabs)/cards.tsx`

| Aspect | Rating | Notes |
|--------|--------|-------|
| Search | 8/10 | Fuse.js fuzzy search with 300ms debounce. Weights card_name (0.7) over bank_name (0.3). |
| Featured section | 8/10 | `FeaturedCardsSection` highlights recommended additions. Good cross-sell. |
| Inventory | 8/10 | `SmartWalletInventory` with `WalletInventoryRow`. Cards are visually distinctive. |
| Empty state | 9/10 | Animated pulse rings + CreditCard icon + CTA. Premium and on-brand. (See §9 detail) |
| Skeleton | 8/10 | 3 card skeletons with shimmer. Title (180px) + subtitle (120px) + circle (40px) + footer. Accurate layout. |
| Personality layer | 9/10 | `PortfolioLens` + `BehavioralSignalsSurface` add intelligence — this is Smart CC's differentiator. |
| Bottom sheets | 8/10 | AddCardSheet, CardDetailSheet, EditAnnualFeeSheet etc. Non-disruptive. |
| Scroll depth | 6/10 | Featured + Inventory + Portfolio Lens + Behavioral Signals = potentially very long scroll. No collapsible sections. |

**Score:** 8/10 → **Target:** 9/10

**Fixes:**
- **P1:** Add collapsible/accordion sections for PortfolioLens and BehavioralSignals (or sticky section headers)
- **P2:** Empty search state: "No cards match '{query}'" with a clear button
- **P3:** Add card count summary chip at top ("4 cards · ₹12,450 annual fees")

---

### 03 — Activity Tab

**Current state:** `app/(tabs)/history.tsx`

| Aspect | Rating | Notes |
|--------|--------|-------|
| Date grouping | 9/10 | `SectionList` with `groupTransactionsByDate`. Standard and effective. |
| Savings summary | 8/10 | Animated total + best category. Clean gradient card. |
| Charts | 7/10 | `CategoryRewardsChart` — horizontal bars. Good. Could use more visual polish. |
| Leakage card | 8/10 | `RewardLeakageCard` identifies missed opportunities. Actionable insight. |
| Transaction rows | 8/10 | Icon + merchant + card + amount. Standard but clear. |
| Empty state | 8/10 | Animated pulse + Receipt icon + "Log a Transaction" CTA. See §9. |
| Skeleton | 7/10 | Date header (100px) + 3 rows (icon circle + 2 text lines + amount). Accurate but plain. |
| Pull to refresh | 9/10 | RefreshControl wired up. |
| Infinite scroll | 8/10 | `fetchNextPage` with `hasNextPage`. Works. |
| Insight toggle | 5/10 | `showInsights` state toggle — **not discoverable at all**. Hidden behind a state variable with no visible trigger. |

**Score:** 8/10 → **Target:** 9/10

**Fixes:**
- **P1:** Expose `showInsights` toggle as a visible segmented control or filter chip row at the top
- **P2:** Improve `CategoryRewardsChart` visual design — add subtle gradient bars, better labels
- **P2:** Add empty filter state: "No transactions for this card" when filtering by cardId
- **P3:** Add month navigation (similar to monthly-intelligence) for historical browsing

---

### 04 — Profile Tab

**Current state:** `app/(tabs)/profile.tsx` (293 lines)

| Aspect | Rating | Notes |
|--------|--------|-------|
| Avatar | 9/10 | Gradient circle (primary → #8B5CF6) with initials. Strong visual anchor. |
| Stats bar | 7/10 | Cards count + Transactions count in a pill. Good but thin. Only 2 stats. |
| Theme pills | 9/10 | 3-segment pill (System/Light/Dark) inside a bordered row. This is premium UX. |
| Settings rows | 8/10 | Icon in circle + label + chevron. Consistent. Danger row (Sign Out) uses danger colors. |
| Admin section | 8/10 | Conditionally rendered for ADMIN role. Clean. |
| Visual weight | 5/10 | After the stats bar, it's just a list of settings rows. Compared to Analyze/Wallet/Activity, it feels **visually thin**. |
| Skeleton handling | 7/10 | Card/transaction counts have SkeletonBox fallbacks. Good but basic. |
| Version text | 7/10 | "Smart CC OS · v1.0.0" — nice touch but `textMuted` on background, which fails contrast. |

**Score:** 7/10 → **Target:** 9/10

**Fixes (see §6 for full plan):**
- **P1:** Add a "Your Summary" card section above settings — lifetime rewards, optimization rate, best card
- **P1:** Add achievement/metric cards that reuse existing data (no new API calls)
- **P2:** Stats bar could show 3 items instead of 2: Cards, Transactions, Rewards
- **P2:** Add a "Help & Feedback" row before Sign Out
- **P0:** Fix version text contrast

---

### 05 — Monthly Intelligence

**Current state:** `app/monthly-intelligence.tsx`

| Aspect | Rating | Notes |
|--------|--------|-------|
| Month navigation | 9/10 | Chevron-based month switcher with future-date lock. Excellent. |
| Hero narrative | 8/10 | `HeroNarrative` — the main monthly story. Good hierarchy placement. |
| Behavioral highlights | 8/10 | Pattern recognition surfaced to user. On-brand. |
| Optimization visuals | 8/10 | Charts and optimization timeline. |
| Forecasting | 9/10 | `ForecastingSurface` — this is the differentiator. AI-forward. |
| Explainability | 9/10 | `ExplainabilitySheet` on tap — users can interrogate the AI's reasoning. Outstanding. |
| Anticipatory state | 7/10 | "Observing patterns." with Activity icon. Clean but could be warmer. |
| Loading | 6/10 | `ActivityIndicator` only. No skeleton. |
| Empty/error | 6/10 | Basic error state. |

**Score:** 8/10 → **Target:** 9/10

**Fixes:**
- **P2:** Add skeleton loading for monthly intelligence (matching the card skeleton pattern)
- **P2:** Improve `AnticipatoryState` with a progress-like indicator ("X transactions analyzed this month")
- **P3:** Add share/export button for monthly report

---

### 06 — Search

**Current state:** `app/search/index.tsx` + `app/search/results.tsx`

| Aspect | Rating | Notes |
|--------|--------|-------|
| Search header | 9/10 | Back arrow + search bar with clear button. SlideInDown animation. |
| Trending searches | 8/10 | Hardcoded trending chips (Amazon, Flipkart, Swiggy, Zomato, MakeMyTrip). Good for empty state. |
| Popular categories | 8/10 | Category chips (Fuel, Dining, Travel, Grocery, Online Shopping). |
| Results | 8/10 | Grouped by type (Merchants, Categories, Cards, Offers) with staggered entry animations. |
| No results | 6/10 | Plain text: "No results found for X". No retry, no suggestions. |
| Loading | 7/10 | Small ActivityIndicator in center. |
| Keyboard handling | 9/10 | `KeyboardAvoidingView` + `keyboardShouldPersistTaps`. |
| Autofocus | 8/10 | Input focused after 100ms timeout. Good. |

**Score:** 8/10 → **Target:** 9/10

**Fixes:**
- **P2:** Improve "no results" state — add suggestions, "try a different search term", or category browse
- **P2:** Add search history (localStorage-based, no backend)
- **P3:** Add skeleton for search results loading (currently just a spinner)

---

### 07–09 — Modals (Notifications, Preferences, Security)

**Notifications:** 8/10 — Strong design. Icon-per-type with color coding, unread dot, "Mark all read", pull-to-refresh. Animations with `FadeInDown.delay(i * 50)`.

**Preferences:** 7/10 — Clean form but content-light. Could group preferences into categories.

**Security:** 7/10 — Functional but minimal. No session management, no device list.

**Overall modal score:** 7.5/10 → **Target:** 8.5/10

---

### 10–12 — Admin Screens

Functional, follow same design language. Lower priority for visual refresh. **Score:** 7/10 → **Target:** 8/10 (better loading states, empty states).

---

## 2. Prioritized Improvements

### P0 — Must Fix (Accessibility + First-Time UX)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P0-1 | `textMuted` (#A7B0C0) fails 4.5:1 contrast in light mode | `theme/colors.ts` | 5 min |
| P0-2 | All uses of `textMuted` must be re-audited for minimum size requirement | ~30 files | 1 hr |
| P0-3 | Onboarding flow — first-time user education | New component | 4 hr |
| P0-4 | `ErrorBanner` is a TODO skeleton — must implement | `components/ui/ErrorBanner.tsx` | 1 hr |

### P1 — Should Fix (Clarity + Profile + Polish)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P1-1 | Rename "Opt. Score" to "Reward Efficiency" | `app/(tabs)/index.tsx` | 15 min |
| P1-2 | Profile enrichment — stats + achievement cards | `app/(tabs)/profile.tsx` | 3 hr |
| P1-3 | Insight toggle discoverability on Activity | `app/(tabs)/history.tsx` | 1 hr |
| P1-4 | Wallet collapsible sections | `app/(tabs)/cards.tsx` | 2 hr |
| P1-5 | Improve `AnimatedNumber` to use `Text` not `TextInput` | `components/ui/AnimatedNumber.tsx` | 1 hr |

### P2 — Nice to Have (Polish + Delight)

| # | Issue | File(s) | Effort |
|---|-------|---------|--------|
| P2-1 | Dashboard empty state variant | `app/(tabs)/index.tsx` | 2 hr |
| P2-2 | Skeleton for monthly intelligence | `app/monthly-intelligence.tsx` | 1.5 hr |
| P2-3 | Search "no results" improvement | `app/search/index.tsx` | 1 hr |
| P2-4 | CategoryRewardsChart visual polish | `features/transactions/components/CategoryRewardsChart.tsx` | 2 hr |
| P2-5 | "Forgot password" link on login | `app/(auth)/login.tsx` | 30 min |
| P2-6 | Pull-to-refresh on dashboard | `app/(tabs)/index.tsx` | 30 min |
| P2-7 | Share/export monthly intelligence | `app/monthly-intelligence.tsx` | 2 hr |
| P2-8 | Animation reduced-motion audit | ~20 animated components | 2 hr |

---

## 3. Accessibility Findings (P0)

### 3.1 COLOR CONTRAST — CRITICAL

**The problem:** `textMuted` is `#A7B0C0` in light mode. Against `#FFFFFF` (surface), this gives a contrast ratio of **2.4:1**, which fails WCAG AA (4.5:1) for normal text and WCAG AAA (7:1).

**Affected locations (sampling):**
- Section headers (uppercase labels): `sectionTitle` on Dashboard, Wallet, Activity, Profile
- Icon colors on inactive tab bar items
- Divider text ("or continue with") on Login
- Stat labels ("Cards", "Transactions") on Profile
- Version text on Profile
- Search placeholder text
- Notification time stamps

**The fix — two-tier muted text:**

```
// Current (broken):
textMuted: '#A7B0C0'       // 2.4:1 on white ❌

// Proposed (WCAG-compliant):
textMuted: '#6B7280'        // 5.0:1 on white ✅ (use for body-sized muted text)
textMutedLarge: '#8E96A6'   // 3.5:1 on white ✅ (use for 18px+ / bold labels only — AA Large)
```

**Migration strategy:**

| Current use | New token | Rationale |
|-------------|-----------|-----------|
| Section headers (9-11px bold uppercase) | `textMutedLarge` | Bold + uppercase = large text exemption |
| Inactive tab icons & labels | `textMutedLarge` | 11px bold uppercase |
| Divider text | `textMutedLarge` | Short text |
| Stat labels | `textMuted` | 9px bold — too small for large exemption. Must use 5:1. |
| Search placeholder | `textMuted` | 16px body text — must meet 4.5:1 |
| Notification timestamps | `textMuted` | 9px — small text, needs 4.5:1 |
| Version text | `textMuted` | 11px — needs proper contrast |
| Card secondary text | `textMuted` | 11-14px on surface — needs 4.5:1 |

**Implementation:** Update `theme/colors.ts`:

```typescript
// In lightTheme:
textMuted: '#6B7280',         // was #A7B0C0 — 5.0:1 on white
textMutedLarge: '#8E96A6',    // NEW — 3.5:1 on white, large text only

// In darkTheme (current #64748B → 6.0:1 on #0A0E17 — already fine):
textMuted: '#64748B',         // Keep — good contrast on dark
textMutedLarge: '#7C8AA0',    // NEW — lighter variant for large text on dark
```

### 3.2 FOCUS STATES

**Gap:** No keyboard focus indicators found. On web, `Tab` navigation through interactive elements shows no visible focus ring. React Native Web defaults may not provide focus outlines.

**Fix:** Add a global `:focus-visible` style or wrap `TouchableOpacity` with focus ring support:

```typescript
// In a new utility or base component
const focusStyle = Platform.OS === 'web' ? {
  ':focus-visible': { outline: `2px solid ${colors.primary}`, outlineOffset: 2 }
} : {};
```

### 3.3 REDUCED MOTION

**Gap:** `prefers-reduced-motion` is not checked anywhere. All animations in the app run unconditionally:
- `FadeInDown.springify()` on every screen
- `withRepeat` pulse rings on empty states
- `withSpring` button presses
- `SkeletonBox` shimmer animation
- `AnimatedNumber` value transitions

**Fix:** Add a `useReduceMotion` hook and gate all animations:

```typescript
// hooks/useReduceMotion.ts
import { useWindowDimensions } from 'react-native';
// On web, check matchMedia; on native, check AccessibilityInfo
export function useReduceMotion(): boolean { ... }
```

### 3.4 SCREEN READER LABELS

**Partial:** Tab buttons have `accessibilityRole="button"` and `accessibilityLabel`. But most `TouchableOpacity` instances in rows, cards, and chips lack labels.

**Fix:** Add `accessibilityLabel` to:
- Transaction rows
- Card inventory rows
- Search result rows
- Settings rows
- Stat cards (they're not interactive but should convey their value)

### 3.5 ACCESSIBILITY SCORE

| Criterion | Before | After |
|-----------|--------|-------|
| Color contrast (body text) | ✅ 15:1 | ✅ 15:1 |
| Color contrast (muted text) | ❌ 2.4:1 | ✅ 5.0:1 |
| Focus states (web) | ❌ None | ✅ Visible rings |
| Reduced motion | ❌ Not checked | ✅ Respected |
| Screen reader labels | ⚠️ Partial | ✅ Complete |
| Touch targets (≥44px) | ✅ 56px min | ✅ 56px min |
| Touch spacing | ✅ 8px gap | ✅ 8px gap |

**Accessibility score: 7.0 → 9.0/10**

---

## 4. Onboarding Proposal (P0)

### Design Principles

1. **Dismissible** — Can be skipped. Persists dismissal in localStorage/AsyncStorage.
2. **Local-state only** — No backend, no new APIs, no schema changes.
3. **Smart CC specific** — Not generic fintech. Focus on what makes this product unique.
4. **3 cards maximum** — Short attention span. Each card one concept.
5. **Visual, not textual** — Icons/illustrations > walls of text.

### Flow

```
App Launch → Check localStorage('onboarding_complete')
  ├── true  → Normal app (tabs)
  └── false → OnboardingModal (full-screen, 3 slides)
                ├── Slide 1: "AI That Optimizes Your Cards"
                │   Icon: Sparkles + CreditCard combo
                │   Body: "Smart CC analyzes your wallet and transactions to maximize rewards. Every time."
                │
                ├── Slide 2: "Never Miss a Reward"
                │   Icon: Trophy with glow
                │   Body: "See which card to use BEFORE you pay. Track fee waivers. Know your optimization rate."
                │
                └── Slide 3: "Start with One Transaction"
                    Icon: Plus in circle
                    Body: "Log a transaction and get your first AI recommendation. It takes 30 seconds."
                    CTA: "Get Started" (primary button)
                    
                Footer: Dot indicators + "Skip" link
```

### Technical Implementation

```typescript
// New file: features/onboarding/components/OnboardingModal.tsx
// Uses: FlatList with pagingEnabled for horizontal swipe
// State: persisted via useOnboardingStore (zustand + localStorage/AsyncStorage)
// Trigger: RootLayout checks onboarding_complete after auth
```

**Files to create:**
1. `features/onboarding/store/onboardingStore.ts` — single boolean `hasSeenOnboarding`
2. `features/onboarding/components/OnboardingModal.tsx` — the modal itself
3. `features/onboarding/components/OnboardingSlide.tsx` — individual slide

**Files to modify:**
1. `app/_layout.tsx` — add onboarding check after auth initialization

**Constraints met:**
- ✅ No backend changes
- ✅ No new APIs
- ✅ No new business logic
- ✅ Dismissible
- ✅ Local-state only

---

## 5. Dashboard Clarity (P1)

### "Opt. Score" Rename Analysis

**Current:** "Opt. Score" (abbreviation of "Optimization Score")

**Candidates:**

| Option | Clarity | Length | Recommendation |
|--------|---------|--------|----------------|
| Optimization Score | ⭐⭐⭐⭐⭐ | Long (17 chars) | Too verbose for stat card label |
| Reward Efficiency | ⭐⭐⭐⭐ | Medium (17 chars) | Clear, benefit-focused ✅ |
| Savings Efficiency | ⭐⭐⭐ | Medium (18 chars) | "Savings" implies cost reduction, not reward maximization |
| Opt. Rate | ⭐⭐ | Short (9 chars) | Still an abbreviation |
| Card Efficiency | ⭐⭐ | Medium (15 chars) | Too vague |

**Recommendation: "Reward Efficiency"**

**Rationale:**
- "Reward" is the user-facing benefit. Users understand rewards.
- "Efficiency" conveys optimization without jargon.
- Fits in existing stat card label space (currently 2-line: "Opt." / "Score" → becomes "Reward" / "Efficiency")
- Works with the trophy icon (reward imagery)
- The metric already represents `optimization_rate` (percentage of possible rewards captured)

**Implementation:**

```typescript
// In app/(tabs)/index.tsx, stat card section:
<View style={styles.statHeader}>
  <Trophy size={16} color={colors.warning} />
  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
    Reward Efficiency
  </Text>
</View>
```

**Bonus:** Add a small (i) icon next to the label that shows a tooltip: "How much of your potential rewards you're capturing. 100% means you're using the best card every time."

---

## 6. Profile Enrichment (P1)

### Current State

Profile has:
- Avatar gradient + initials
- Stats bar (2 stats: Cards, Transactions)
- Theme selector (3 pills)
- Settings rows (Notifications, Preferences, Security)
- Optional Admin section
- Sign Out
- Version text

**Problem:** Everything below the stats bar is a flat list. No personality, no achievements, no value-add. Compare to Analyze (dynamic stats + recommendations) or Wallet (cards + personality insights).

### Proposed Structure (no new APIs)

```
┌─────────────────────────────┐
│     [Avatar Gradient]       │  ← Keep, already excellent
│     Alex Morgan             │
│  ┌───────────────────────┐  │
│  │  4 Cards · 127 Txns · ₹8,420 Rewards  │  │  ← Expanded: 3 stats
│  └───────────────────────┘  │
├─────────────────────────────┤
│  YOUR SUMMARY               │  ← NEW section
│  ┌───────────────────────┐  │
│  │ 🏆 Reward Efficiency  │  │  ← Reuses monthlySummary data
│  │    78% · +12% this mo │  │
│  │ 💳 Best Card          │  │  ← Reuses cards data
│  │    HDFC Infinia · 5.2% │  │
│  │ 📊 Top Category       │  │  ← Reuses transaction data
│  │    Dining · ₹34,500   │  │
│  └───────────────────────┘  │
├─────────────────────────────┤
│  APPEARANCE                 │  ← Keep as-is
│  [System | Light | Dark]   │
├─────────────────────────────┤
│  ACCOUNT                    │  ← Keep, may add "Help & Feedback"
│  🔔 Notifications      ›   │
│  ⚙️ Preferences        ›   │
│  🔒 Security           ›   │
│  💬 Help & Feedback    ›   │  ← NEW
├─────────────────────────────┤
│  [Admin section if ADMIN]   │
├─────────────────────────────┤
│  Sign Out                   │
│  Smart CC OS · v1.0.0      │
└─────────────────────────────┘
```

### Implementation Details

**"Your Summary" card** — uses EXISTING hooks:

```typescript
// In profile.tsx, add:
const { data: monthlySummary } = useMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1);
const { data: allTransactions } = useTransactions(); // for total rewards sum

// Compute from existing data:
const totalRewards = allTransactions?.pages
  .flatMap(p => p.data)
  .reduce((sum, tx) => sum + (tx.reward_earned || 0), 0) || 0;

const bestCard = cards?.reduce((best, card) => {
  // Find card with highest reward rate from card_details
  // ...
}, null);
```

**This requires ZERO new API calls** — all data is already fetched on other tabs. We're just aggregating it visually.

### Visual Design

The "Your Summary" card should use the `Card` component with `variant="elevated"` and contain 3 rows:
- Each row: icon (in soft-bg circle) + label + value
- Subtle divider between rows
- Animated entry with `FadeInDown`

### Effort: 3 hours (1 new component + profile.tsx modifications)

---

## 7. Animation Audit

### Full Inventory — Classified

| Animation | Location | Type | FPS Risk | Classification | Action |
|-----------|----------|------|----------|----------------|--------|
| **Tab bar press scale** | `(tabs)/_layout.tsx` | `withSpring` (snappy/calm) | None | **Keep** | — |
| **Button press scale** | `Button.tsx` | `withSpring` (0.97→1) | None | **Keep** | — |
| **FadeInDown.staggered** | Every screen (50→250ms delays) | `FadeInDown.springify()` | None | **Keep** | Gate with reduced-motion |
| **ScreenContainer orbs** | `ScreenContainer.tsx` | Static CSS blur | None (GPU) | **Keep** | Signature element |
| **SkeletonBox shimmer** | `SkeletonBox.tsx` | `withRepeat(translateX)` | Low | **Keep** | Gate with reduced-motion |
| **Skeleton pulse opacity** | `WalletCardSkeleton.tsx` | `withRepeat(opacity 0.3↔0.7)` | None | **Keep** | Gate with reduced-motion |
| **Empty state pulse rings** | `EmptyWalletState.tsx`, `EmptyTransactionState.tsx` | `withRepeat(scale 1→1.5 + opacity 0.4→0)` | Low (3 rings) | **Keep** | Beautiful. Gate with reduced-motion. |
| **AnimatedNumber** | `AnimatedNumber.tsx` | `withTiming` on `useAnimatedProps` | None | **Improve** | Use `Text` not `TextInput` (see below) |
| **AnimatedNumber (Savings)** | `SavingsSummaryCard.tsx` | Same as AnimatedNumber but inline | None | **Improve** | Use unified AnimatedNumber |
| **Login staggered entries** | `login.tsx` | `FadeInDown.delay().springify()` (3 items) | None | **Keep** | Gate with reduced-motion |
| **Search header SlideInDown** | `search/index.tsx` | `SlideInDown.springify()` | None | **Keep** | — |
| **Search results stagger** | `search/index.tsx` | `FadeInDown.delay(i*50)` | None | **Keep** | — |
| **Notification stagger** | `notifications.tsx` | `FadeInDown.delay(i*50)` | None | **Keep** | — |
| **AnimatedContainer** | `AnimatedContainer.tsx` | `FadeInDown` + `FadeOut` | None | **Improve** | Add reduced-motion fallback |
| **TermsDisclaimerModal** | `TermsDisclaimerModal.tsx` | Unknown (not inspected) | — | **Audit** | Check for animations |
| **TransactionFormSheet** | `TransactionFormSheet.tsx` | Sheet slide-up | None | **Keep** | Bottom sheet native animation |

### Animation to Improve: AnimatedNumber

**Current implementation:** Uses `Animated.createAnimatedComponent(TextInput)` — this is a workaround. `TextInput` is not designed for read-only display. It adds unnecessary overhead (keyboard handling, selection, cursor management).

**Proposed fix:** Use `Reanimated`'s `useAnimatedStyle` with a regular `Animated.Text` and `runOnJS` for formatting:

```typescript
// Simplified: useAnimatedProps is fine for TextInput but we want Text
// Better approach: use SharedValue + useAnimatedStyle with a formatted string
// Actually, the current approach works. The "improve" is to add reduced-motion fallback
// where the value jumps instantly instead of animating.
```

**Minimal fix:** Add `useReduceMotion` check — if true, skip animation and show static value.

### Animation to Add (Delight)

1. **Pull-to-refresh custom indicator** — Replace default spinner with a subtle branded animation (pulsing Smart CC logo or sparkle)
2. **Card flip/expand** — When tapping a wallet card, a subtle scale + elevation transition before the detail sheet opens
3. **Recommendation glow** — When a new recommendation appears, a one-time subtle glow pulse around the recommendation card
4. **Success confetti** — On first transaction log, a subtle sparkle animation (Reanimated, no library needed)

### Reduced Motion Policy

All animations must check:

```typescript
// hooks/useReduceMotion.ts
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    }
  }, []);
  return reduceMotion;
}
```

When `reduceMotion` is true:
- `FadeInDown.springify()` → `FadeIn.duration(100)` (instant fade, no translation)
- `withSpring` → `withTiming(..., { duration: 0 })`
- Pulse rings → hidden
- Shimmer → solid color
- AnimatedNumber → static value

---

## 8. Typography Findings

### Current System

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `micro` | 9px | bold | — | Section headers, status pills |
| `caption` | 11px | bold | — | Labels, timestamps |
| `label` | 12px | bold | — | Form labels |
| `bodySm` | 12px | medium | — | Small body |
| `body` | 14px | medium | 1.55 | Body text |
| `bodyLg` | 16px | medium/bold | 1.55 | Large body, card titles |
| `title` | 18px | bold | — | Titles |
| `headline` | 22px | bold/heavy | — | Stat values, section heads |
| `display` | 32px | heavy | 1.15 | Login hero |
| `hero` | 48px | heavy | — | Large numerals |
| `heroXl` | 60px | heavy | 1.05 | Dashboard hero |

### Assessment

**Strengths:**
- Clear hierarchy from 9px → 60px
- Consistent weight differentiation (medium for body, bold for emphasis, heavy for heroes)
- Letter spacing is well-considered (`tightest: -1.5` for heroes, `widest: 2` for micro labels)
- Single typeface approach works well for a utility app

**Issues:**

1. **9px `micro` is too small for accessibility.** While it passes technically as "large text" when bold+uppercase, it strains readability. Consider bumping to 10px.

2. **`heroXl` at 60px is oversized for mobile.** On a 390px viewport, "Dashboard" at 60px consumes ~60% of the width. Consider 48px (`hero`) for the dashboard title, reserving `heroXl` for key numeric displays only.

3. **Missing `fontFamily` specification.** The tokens file has no font family. The app uses the system default (San Francisco on iOS, Roboto on Android). This is fine for a utility app but limits brand expression.

4. **`lineHeight` tokens exist but aren't consistently applied.** The tokens define `tight: 1.1`, `normal: 1.4`, `relaxed: 1.6` but most inline styles use manual multipliers (e.g., `fontSize * 1.55`).

### Recommendations

1. **Bump `micro` → 10px** (file: `theme/tokens.ts`)
2. **Use `hero` (48px) for dashboard title** instead of `heroXl` (60px) — file: `app/(tabs)/index.tsx`
3. **Standardize line heights to use tokens:**
   ```typescript
   // Instead of:
   lineHeight: tokens.fontSize.bodyLg * 1.55,
   // Use:
   lineHeight: tokens.fontSize.bodyLg * tokens.lineHeight.relaxed,
   ```
4. **Add `fontFamily` token** (optional, P3):
   ```typescript
   fontFamily: {
     sans: Platform.select({ ios: 'System', android: 'Roboto', default: 'Inter, system-ui, sans-serif' }),
     mono: Platform.select({ ios: 'Menlo', android: 'monospace' }),
   }
   ```

---

## 9. Empty State Audit

### 9.1 Wallet Empty State

**Component:** `EmptyWalletState.tsx`  
**Score:** 9/10

**What works:**
- Animated pulse rings (3 concentric circles scaling + fading in staggered loop). This is premium.
- CreditCard icon in a bordered circle center
- Title: "Your Digital Wallet" — clear
- Body: "Connect your credit cards to unlock AI-powered reward optimization and intelligent spend routing." — value-prop driven
- CTA: "Add Your First Card" — primary button, action-oriented
- `FadeIn.delay(100)` entrance

**What to improve:**
- Body text at 53 words is too long. Shorten to ~20 words.
- Add a subtle illustration or the Smart CC ambient orb in the background

**Verdict:** Keep. Minor copy trim only.

---

### 9.2 Activity Empty State

**Component:** `EmptyTransactionState.tsx`  
**Score:** 8/10

**What works:**
- Same pulse ring pattern as Wallet (code duplication, but consistent UX)
- Receipt icon
- Title: "No Activity Yet"
- Body: "Log your transactions to see AI-driven insights..."
- CTA: "Log a Transaction" — secondary variant

**What to improve:**
- CTA should be primary variant (this is the core action)
- Body copy could connect more directly to rewards: "Each transaction unlocks AI recommendations that maximize your rewards."

**Verdict:** Keep. Minor variant + copy changes.

---

### 9.3 Search Empty State

**Component:** Inline in `search/index.tsx`  
**Score:** 7/10

**What works:**
- Trending searches chips (hardcoded: Amazon, Flipkart, Swiggy, Zomato, MakeMyTrip)
- Popular categories chips (Fuel, Dining, Travel, Grocery, Online Shopping)
- Chips are interactive — tap to populate search

**What to improve:**
- Hardcoded trending searches should eventually be dynamic (API or localStorage popularity)
- "No results" state is a plain text string — should offer category browsing as fallback

**Verdict:** Good enough. Improve no-results state.

---

### 9.4 Monthly Intelligence Empty State

**Component:** `AnticipatoryState.tsx`  
**Score:** 7/10

**What works:**
- Activity icon in bordered circle
- Title: "Observing patterns." — calm, appropriate tone
- Body explains that intelligence requires context/transactions
- `FadeInDown.duration(800).springify()` — slower, more deliberate

**What to improve:**
- Could show a progress indicator: "X transactions this month · Need Y more for insights"
- The icon is static — could add a subtle pulse (not the 3-ring pattern, just a gentle opacity wave)

**Verdict:** Keep. Add progress indicator.

---

### 9.5 Dashboard Empty State

**Component:** None — conditional rendering  
**Score:** 4/10

**Current behavior:** When `hasStats` is false, the stats section simply doesn't render. The dashboard shows only: greeting + "Your Monthly Intelligence" pill + empty recommendation area + "Add Transaction" CTA.

**Problem:** This feels broken. A new user sees a mostly empty screen with no explanation of what will appear.

**Proposed fix:** Add an `EmptyDashboardState` component that renders when `!hasStats && !primaryInsight`:

```
┌─────────────────────────────┐
│  Good morning · Smart CC    │
│  Welcome to Smart CC        │
│  Your AI assistant awaits.  │
│                             │
│  [Your Monthly Intelligence]│
│                             │
│  ┌───────────────────────┐  │
│  │  ✨                   │  │
│  │  Your dashboard will  │  │
│  │  come alive once you  │  │
│  │  add your first card  │  │
│  │  and transaction.     │  │
│  │                       │  │
│  │  [Add a Card] [Log Tx]│  │
│  └───────────────────────┘  │
│                             │
│  [➕ Add Transaction]       │
└─────────────────────────────┘
```

---

## 10. Charts & Delight Layer

### Current Charts

| Chart | Location | Type | Quality |
|-------|----------|------|---------|
| CategoryRewardsChart | Activity tab | Horizontal bars | 7/10 — Functional, could be more polished |
| OptimizationVisuals | Monthly Intelligence | Timeline + visualizations | 8/10 — Good |
| RewardLeakageCard | Activity tab | Leakage visualization | 8/10 — Actionable insight |

### Proposed: Optimization Donut

**Purpose:** "Rewards captured vs missed opportunity"  
**Allowed locations:** Monthly Intelligence screen (already has charts area)  
**NOT on:** Dashboard (unless recommendations remain above the fold — and there's no natural above-fold space for it)

**Implementation:**
- Use `react-native-gifted-charts` (already in dependencies) `PieChart` component
- Two segments: captured (success color) + missed (muted/neutral)
- Center label: percentage captured
- Animated on mount using Reanimated shared value

**Constraint:** Only render if `monthlySummary?.optimization_rate` exists. No new calculations.

### Proposed: Category Rewards Polish

**Current:** Horizontal bars in `CategoryRewardsChart`

**Improvement:**
- Add subtle gradient fill to bars (category color → lighter variant)
- Add icon per category
- Add "tap to see transactions" interaction (already possible — just add onPress)
- Animate bar width on mount

### Constraint Enforcement

```
Priority:
1. Recommendation ← Always the hero
2. Insights      ← Context for the recommendation  
3. Charts        ← Supporting visualization

Never: chart-first layouts, analytics dashboards, decorative-only charts
```

---

## 11. Design System Improvements

### 11.1 Color Tokens

```diff
  textMuted: '#A7B0C0',
+ textMutedLarge: '#8E96A6',    // For large text (≥18px bold or ≥14px bold uppercase)
  // textMuted changes to:
- textMuted: '#A7B0C0',
+ textMuted: '#6B7280',         // 5.0:1 contrast ✅
```

### 11.2 Typography Tokens

```diff
- micro: 9,
+ micro: 10,                    // Accessibility minimum

  // Add font family tokens:
+ fontFamily: {
+   sans: 'System',
+   mono: 'monospace',
+ },
```

### 11.3 New Hook: useReduceMotion

```typescript
// New file: hooks/useReduceMotion.ts
// Returns true when user prefers reduced motion
// Used to gate all animations
```

### 11.4 ErrorBanner Implementation

**Current:** `components/ui/ErrorBanner.tsx` is a TODO skeleton — JSDoc only, no implementation.

**Proposed:**

```typescript
interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
}

// Renders a full-width banner with:
// - Left icon (AlertTriangle / AlertCircle / Info)
// - Message text
// - Optional retry button
// - Optional dismiss X button
// - Animated entry (SlideInDown) / exit (SlideOutUp)
```

### 11.5 Component Audit — Missing Pieces

| Component | Status | Action |
|-----------|--------|--------|
| `ErrorBanner` | TODO skeleton | Implement (P0) |
| `EmptyDashboardState` | Missing | Create (P2) |
| `OnboardingModal` | Missing | Create (P0) |
| `ProfileSummaryCard` | Missing | Create (P1) |
| `useReduceMotion` hook | Missing | Create (P2) |
| `SkeletonBox` for dark mode | Works | Verify shimmer gradient visible on dark bg |

---

## 12. Detailed Implementation Plan

### Phase 1 — P0: Accessibility + Error Handling (2 hours)

| Step | File | Action |
|------|------|--------|
| 1.1 | `theme/colors.ts` | Update `textMuted` to `#6B7280`, add `textMutedLarge: '#8E96A6'` |
| 1.2 | `theme/colors.ts` | Update dark theme `textMutedLarge: '#7C8AA0'` |
| 1.3 | ~30 files | Replace `colors.textMuted` with `colors.textMutedLarge` where used for large/bold text (section headers, tab labels) |
| 1.4 | `components/ui/ErrorBanner.tsx` | Implement ErrorBanner component |
| 1.5 | `app/_layout.tsx` | Add ErrorBanner for connectivity errors |
| 1.6 | Verify | Re-run Playwright screenshot script. Confirm contrast on all screens. |

### Phase 2 — P0: Onboarding (4 hours)

| Step | File | Action |
|------|------|--------|
| 2.1 | `features/onboarding/store/onboardingStore.ts` | Create zustand store with `hasSeenOnboarding` |
| 2.2 | `features/onboarding/components/OnboardingSlide.tsx` | Individual slide with icon, title, body |
| 2.3 | `features/onboarding/components/OnboardingModal.tsx` | Full-screen modal with FlatList pager, dot indicators, Skip + Get Started |
| 2.4 | `app/_layout.tsx` | Add onboarding gate after auth initialization |
| 2.5 | Test | Login as new user (clear localStorage) → onboarding appears. Dismiss → never shows again. |

### Phase 3 — P1: Dashboard + Profile (5 hours)

| Step | File | Action |
|------|------|--------|
| 3.1 | `app/(tabs)/index.tsx` | Rename "Opt. Score" → "Reward Efficiency" |
| 3.2 | `app/(tabs)/index.tsx` | Add `EmptyDashboardState` for new users |
| 3.3 | `features/profile/components/ProfileSummaryCard.tsx` | New component — aggregated stats card |
| 3.4 | `app/(tabs)/profile.tsx` | Add ProfileSummaryCard + third stat to stats bar |
| 3.5 | `app/(tabs)/profile.tsx` | Add "Help & Feedback" row (links to feedback form or mailto) |
| 3.6 | `app/(tabs)/history.tsx` | Expose `showInsights` toggle as a visible filter chip |

### Phase 4 — P2: Polish + Delight (6 hours)

| Step | File | Action |
|------|------|--------|
| 4.1 | `hooks/useReduceMotion.ts` | Create hook |
| 4.2 | ~20 animated components | Gate animations with `useReduceMotion` |
| 4.3 | `app/(tabs)/cards.tsx` | Add collapsible sections for Personality layers |
| 4.4 | `app/search/index.tsx` | Improve "no results" state |
| 4.5 | `app/monthly-intelligence.tsx` | Add skeleton loading |
| 4.6 | `components/ui/AnimatedNumber.tsx` | Add reduced-motion fallback |
| 4.7 | `features/transactions/components/CategoryRewardsChart.tsx` | Visual polish — gradient bars, icon per category |
| 4.8 | `app/(auth)/login.tsx` | Add "Forgot password?" link |
| 4.9 | `app/(tabs)/index.tsx` | Add pull-to-refresh |
| 4.10 | Verify | Full Playwright screenshot pass. Compare before/after. |

### Phase 5 — P3: Refinement (3 hours)

| Step | File | Action |
|------|------|--------|
| 5.1 | `theme/tokens.ts` | Bump `micro` to 10px, standardize line heights |
| 5.2 | Multiple | Add `accessibilityLabel` to interactive rows/chips |
| 5.3 | Multiple | Add `fontFamily` token and apply consistently |
| 5.4 | `app/monthly-intelligence.tsx` | Add share/export button |
| 5.5 | Final verification | Full Playwright screenshot pass |

---

## Appendix A: Files NOT to Touch

These files are architecturally sound and do not need changes:

- `theme/tokens.ts` — Except `micro: 9→10` and line height standardization
- `theme/colors.ts` — Except `textMuted` contrast fix
- `components/ui/Card.tsx` — Excellent. Metallic highlight + accent stripe is premium.
- `components/ui/Button.tsx` — Spring press + glow on primary. Keep as-is.
- `components/ui/Badge.tsx` — Clean variant system. Keep.
- `components/ui/ScreenContainer.tsx` — Ambient orbs are signature. Keep.
- `components/ui/SkeletonBox.tsx` — Shimmer is polished. Keep (add reduced-motion gate).
- `features/cards/components/EmptyWalletState.tsx` — Pulse rings are beautiful. Keep.
- `features/transactions/components/EmptyTransactionState.tsx` — Keep (minor copy + variant changes only).
- `app/(tabs)/_layout.tsx` — Floating glass tab bar is iconic. Do NOT touch.
- `features/auth/store/authStore.ts` — Works correctly. Do not modify auth logic.
- All hooks in `features/*/hooks/` — Backend contracts are stable.
- All types in `features/*/types/` — No schema changes.
- `app/admin/*` — Lower priority. Functional is sufficient.

## Appendix B: Score Projection

| Category | Before | After | Delta |
|----------|--------|-------|-------|
| Visual Design | 9.0 | 9.5 | +0.5 |
| UX / Usability | 8.0 | 9.0 | +1.0 |
| Accessibility | 7.0 | 9.0 | +2.0 |
| Consistency | 9.0 | 9.5 | +0.5 |
| Performance/Feedback | 8.5 | 9.0 | +0.5 |
| Content/IA | 7.5 | 8.5 | +1.0 |
| **Overall** | **8.3** | **9.2** | **+0.9** |

*Conservative estimate. With full Phase 1-5 implementation, 9.5 is achievable.*

---

*Audit completed June 13, 2026. All findings based on source code review of 40+ component files + 17 Playwright-captured screenshots.*
