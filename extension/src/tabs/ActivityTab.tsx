import { useEffect, useState } from "react"
import { getTransactions, getCards } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import {
  LayoutList, BarChart3, Trophy, TrendingUp, Plus,
  ShoppingBag, Coffee, Zap, ShoppingCart, Utensils, Plane,
  Car, Film, Home, Sparkles, ArrowUpRight, Receipt,
  AlertTriangle, PieChart, Target, AlertCircle, HelpCircle,
} from "lucide-react"

// ── Category icon mapping (matches Expo categoryAccents.ts) ──────────────
const CATEGORY_ICONS: Record<string, any> = {
  dining: Utensils,
  shopping: ShoppingBag,
  travel: Plane,
  groceries: ShoppingCart,
  utilities: Zap,
  entertainment: Film,
  transport: Car,
  food: Utensils,
  coffee: Coffee,
  home: Home,
}

function getCategoryIcon(category: string) {
  const normalized = (category || "").toLowerCase().trim()
  return CATEGORY_ICONS[normalized] || ShoppingBag
}

// ── Category icon for the rewards chart (matches Expo CategoryRewardsChart) ──
function getChartCategoryIcon(category: string): any {
  const normalized = (category || "").toLowerCase().trim()
  if (normalized.includes("grocer") || normalized.includes("supermarket")) return ShoppingCart
  if (normalized.includes("din") || normalized.includes("restaurant") || normalized.includes("food")) return Utensils
  if (normalized.includes("travel") || normalized.includes("flight") || normalized.includes("hotel")) return Plane
  if (normalized.includes("movie") || normalized.includes("entertain")) return Film
  if (normalized.includes("util") || normalized.includes("bill")) return Zap
  if (normalized.includes("home") || normalized.includes("rent")) return Home
  if (normalized.includes("coffee") || normalized.includes("cafe")) return Coffee
  return HelpCircle
}

// ── Date grouping (matches Expo groupTransactionsByDate) ─────────────────
function groupByDate(transactions: any[]) {
  const groups: Record<string, any[]> = {}
  const now = new Date()
  transactions.forEach((tx) => {
    const date = new Date(tx.transaction_date || tx.created_at)
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    let key: string
    if (diffDays === 0) key = "Today"
    else if (diffDays === 1) key = "Yesterday"
    else if (diffDays < 7) key = "This Week"
    else key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  })
  return Object.entries(groups)
}

// ── Format amount ────────────────────────────────────────────────────────
function formatAmount(amount: number, currency: string = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount)
}

// ── Pulse Ring Component (CSS animation for empty state) ─────────────────
function PulseRing({ delay }: { delay: number }) {
  return (
    <div
      className="plasmo-absolute plasmo-rounded-full plasmo-border plasmo-border-primary"
      style={{
        width: "100px",
        height: "100px",
        animation: `pulse-ring ${1.4 + delay * 0.2}s ease-out infinite`,
      }}
    />
  )
}

export function ActivityTab() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [cards, setCards] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"activity" | "insights">("activity")
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const loadData = async () => {
    setIsLoading(true); setError(null)
    try {
      const result = await getTransactions(1)
      const txList = result.data || []
      setTransactions(txList)
      setCurrentPage(1)
      // Determine if there are more pages to load
      if (result.total !== undefined) {
        setHasMore(txList.length < result.total)
      } else {
        setHasMore(txList.length >= 20) // assume more if we got a full page
      }
    } catch (err: any) { setError(err.message) }
    finally { setIsLoading(false) }
  }

  const loadCards = async () => {
    try { const data = await getCards(); setCards(Array.isArray(data) ? data : []) }
    catch (_) { /* cards are optional for display */ }
  }

  useEffect(() => { loadData(); loadCards() }, [])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const result = await getTransactions(nextPage)
      const moreTx = result.data || []
      if (moreTx.length > 0) {
        setTransactions((prev) => [...prev, ...moreTx])
        setCurrentPage(nextPage)
      }
      if (result.total !== undefined) {
        setHasMore(transactions.length + moreTx.length < result.total)
      } else {
        setHasMore(moreTx.length >= 20)
      }
    } catch (_) { setHasMore(false) }
    finally { setLoadingMore(false) }
  }

  // ── Computed metrics ──────────────────────────────────────────────────
  const totalSpend = transactions.reduce((s, t) => s + (t.amount || 0), 0)
  const totalRewards = transactions.reduce((s, t) => {
    const reward = typeof t.reward_earned === "string" ? parseFloat(t.reward_earned) : (t.reward_earned || 0)
    return s + (isNaN(reward) ? 0 : reward)
  }, 0)
  const txWithRewards = transactions.filter((t) => {
    const r = typeof t.reward_earned === "string" ? parseFloat(t.reward_earned) : t.reward_earned
    return r > 0
  }).length
  const optimizationRate = transactions.length > 0
    ? Math.round((txWithRewards / transactions.length) * 100)
    : 0

  // Best optimization category (matches Expo SavingsSummaryCard)
  const categoryRewards: Record<string, number> = {}
  transactions.forEach((tx) => {
    if (tx.reward_earned && tx.category) {
      const reward = typeof tx.reward_earned === "string" ? parseFloat(tx.reward_earned) : tx.reward_earned
      categoryRewards[tx.category] = (categoryRewards[tx.category] || 0) + reward
    }
  })
  let bestCategory = "None"
  let maxCategoryReward = 0
  for (const [cat, amt] of Object.entries(categoryRewards)) {
    if (amt > maxCategoryReward) { maxCategoryReward = amt; bestCategory = cat }
  }

  // Top categories by reward for the chart (matches Expo CategoryRewardsChart)
  const topRewardCategories = Object.entries(categoryRewards)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const maxReward = topRewardCategories.length > 0 ? topRewardCategories[0][1] : 1

  // Leakage transactions (matches Expo RewardLeakageCard)
  const leakageTransactions = transactions
    .filter((tx) => tx.missed_savings && tx.missed_savings > 0)
    .sort((a, b) => (b.missed_savings || 0) - (a.missed_savings || 0))
    .slice(0, 3)

  // Card lookup helper
  const getCardForTx = (tx: any) => cards.find((c) => c.id === tx.user_card_id)
  const getCardName = (tx: any) => {
    const card = getCardForTx(tx)
    return card?.nickname || card?.card_details?.card_name || "Card"
  }

  const grouped = groupByDate(transactions)

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-4">
      {/* ══════════════════════════════════════════════════════════════════
          HEADER
          ══════════════════════════════════════════════════════════════════ */}
      <div className="plasmo-flex plasmo-justify-between plasmo-items-start plasmo-mb-4">
        <div>
          <h2 className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tightest plasmo-text-text-primary plasmo-mb-1">
            Activity
          </h2>
          <p className="plasmo-text-body-sm plasmo-font-medium plasmo-text-text-secondary">
            Your spending intelligence
          </p>
        </div>
        {transactions.length > 0 && (
          <button
            onClick={loadData}
            className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-bg-primary plasmo-border plasmo-border-primary plasmo-flex plasmo-items-center plasmo-justify-center plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors"
          >
            <Plus className="plasmo-w-5.5 plasmo-h-5.5 plasmo-text-white" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SEGMENTED CONTROL
          ══════════════════════════════════════════════════════════════════ */}
      {transactions.length > 0 && (
        <div className="plasmo-flex plasmo-bg-surface-elevated plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-1 plasmo-mb-4">
          <button
            onClick={() => setActiveTab("activity")}
            className={`plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1.5 plasmo-py-2.5 plasmo-rounded-md plasmo-text-body plasmo-font-semibold plasmo-transition-all ${activeTab === "activity"
                ? "plasmo-bg-surface plasmo-text-text-primary plasmo-border plasmo-border-border plasmo-shadow-sm"
                : "plasmo-text-text-secondary hover:plasmo-text-text-primary"
              }`}
          >
            <LayoutList className="plasmo-w-3.5 plasmo-h-3.5" strokeWidth={2} />
            Activity
          </button>
          <button
            onClick={() => setActiveTab("insights")}
            className={`plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1.5 plasmo-py-2.5 plasmo-rounded-md plasmo-text-body plasmo-font-semibold plasmo-transition-all ${activeTab === "insights"
                ? "plasmo-bg-surface plasmo-text-text-primary plasmo-border plasmo-border-border plasmo-shadow-sm"
                : "plasmo-text-text-secondary hover:plasmo-text-text-primary"
              }`}
          >
            <BarChart3 className="plasmo-w-3.5 plasmo-h-3.5" strokeWidth={2} />
            Insights
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* ══════════════════════════════════════════════════════════════════
          LOADING SKELETON
          ══════════════════════════════════════════════════════════════════ */}
      {isLoading && (
        <div className="plasmo-space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-3"
            >
              <SkeletonBox width="44px" height="44px" className="plasmo-rounded-full" />
              <div className="plasmo-flex-1">
                <SkeletonBox width="50%" height="16px" className="plasmo-mb-2" />
                <SkeletonBox width="30%" height="12px" />
              </div>
              <SkeletonBox width="60px" height="16px" />
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          EMPTY STATE — matches Expo EmptyTransactionState
          ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && transactions.length === 0 && (
        <div className="plasmo-text-center plasmo-py-16">
          {/* Pulse ring animation */}
          <div className="plasmo-w-[100px] plasmo-h-[100px] plasmo-relative plasmo-mx-auto plasmo-mb-8">
            <PulseRing delay={0} />
            <div
              className="plasmo-absolute plasmo-rounded-full plasmo-bg-surface plasmo-border plasmo-border-border-highlight plasmo-flex plasmo-items-center plasmo-justify-center"
              style={{
                width: "66px",
                height: "66px",
                top: "17px",
                left: "17px",
              }}
            >
              <Receipt className="plasmo-w-9 plasmo-h-9 plasmo-text-text-muted" strokeWidth={1.5} />
            </div>
          </div>
          <p className="plasmo-text-title plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-3">
            No Activity Yet
          </p>
          <p className="plasmo-text-body plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-mb-8 plasmo-leading-relaxed">
            Log your transactions to see AI-driven insights and track your optimized rewards over time.
          </p>
          <button
            onClick={loadData}
            className="plasmo-bg-primary-soft plasmo-text-primary plasmo-py-3 plasmo-px-8 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary/10 plasmo-transition-colors"
          >
            Log a Transaction
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ACTIVITY TAB
          ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "activity" && transactions.length > 0 && (
        <div>
          {/* ── Savings Summary Card ── */}
          {totalRewards > 0 && (
            <div className="plasmo-relative plasmo-mb-4">
              <div className="plasmo-p-3.5 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border plasmo-overflow-hidden plasmo-relative">
                {/* Emerald green top glow bar */}
                <div className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-[2px] plasmo-bg-success" style={{ opacity: 0.7 }} />

                {/* Header row */}
                <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-3">
                  <div className="plasmo-w-5 plasmo-h-5 plasmo-rounded-full plasmo-bg-success-soft plasmo-flex plasmo-items-center plasmo-justify-center">
                    <Trophy className="plasmo-w-3 plasmo-h-3 plasmo-text-success" strokeWidth={2} />
                  </div>
                  <span className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-success">Optimization Summary</span>
                </div>

                <p className="plasmo-text-caption plasmo-text-text-secondary plasmo-mb-0.5">You optimized</p>
                <p className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-3">
                  {formatAmount(totalRewards)}
                </p>

                {maxCategoryReward > 0 && (
                  <div className="plasmo-inline-flex plasmo-items-center plasmo-gap-1 plasmo-bg-success-soft plasmo-border plasmo-border-success/25 plasmo-px-2 plasmo-py-1 plasmo-rounded-full">
                    <TrendingUp className="plasmo-w-2.5 plasmo-h-2.5 plasmo-text-success" />
                    <span className="plasmo-text-micro plasmo-font-medium plasmo-text-success">
                      Best: <span className="plasmo-font-bold plasmo-capitalize">{bestCategory}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Transaction List — matches Expo TransactionRow layout ── */}
          {grouped.map(([dateLabel, txs]) => (
            <div key={dateLabel} className="plasmo-mb-4">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-text-text-muted plasmo-uppercase plasmo-tracking-widest plasmo-mb-1.5 plasmo-px-0">
                {dateLabel}
              </p>
              <div className="plasmo-space-y-3">
                {txs.map((tx: any) => {
                  const Icon = getCategoryIcon(tx.category)
                  const cardName = getCardName(tx)
                  const isDifferent = tx.normalized_merchant !== tx.merchant_name
                  const reward = typeof tx.reward_earned === "string"
                    ? parseFloat(tx.reward_earned)
                    : tx.reward_earned
                  const missed = typeof tx.missed_savings === "string"
                    ? parseFloat(tx.missed_savings)
                    : tx.missed_savings
                  const hasReward = reward > 0
                  const hasMissedSavings = missed > 0
                  const isPoints = (tx.reward_type || "").toLowerCase().includes("point")

                  return (
                    <div
                      key={tx.id}
                      className="plasmo-relative plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-3 plasmo-overflow-hidden hover:plasmo-border-primary/20 plasmo-cursor-pointer plasmo-transition-colors"
                    >
                      {/* Network stripe — 3px left edge */}
                      <div className="plasmo-absolute plasmo-left-0 plasmo-top-0 plasmo-bottom-0 plasmo-w-[3px] plasmo-bg-text-muted/30" />

                      {/* Category icon in 44x44 circle — matches Expo */}
                      <div className="plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0">
                        <Icon className="plasmo-w-5 plasmo-h-5 plasmo-text-text-secondary" strokeWidth={1.5} />
                      </div>

                      {/* Merchant info */}
                      <div className="plasmo-flex-1 plasmo-min-w-0">
                        <p className="plasmo-text-body plasmo-font-semibold plasmo-text-text-primary plasmo-capitalize">
                          {tx.normalized_merchant || tx.merchant_name || "Unknown"}
                        </p>
                        <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mt-0.5">
                          <span className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary">
                            {cardName}
                          </span>
                          {isDifferent && (
                            <span className="plasmo-text-caption plasmo-text-text-muted">
                              {" "}• {tx.merchant_name}
                            </span>
                          )}
                        </div>

                        {/* RewardInsightPill — matches Expo RewardInsightPill */}
                        {hasReward && (
                          <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mt-1 plasmo-flex-wrap">
                            <div className="plasmo-inline-flex plasmo-items-center plasmo-gap-1 plasmo-bg-success-soft plasmo-border plasmo-border-success/25 plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">
                              <Sparkles className="plasmo-w-2.5 plasmo-h-2.5 plasmo-text-success" strokeWidth={2.5} />
                              <span className="plasmo-text-caption plasmo-font-bold plasmo-text-success">
                                {isPoints ? `+${Math.round(reward)} pts` : `+${formatAmount(reward)}`}
                              </span>
                            </div>
                            {hasMissedSavings && (
                              <div className="plasmo-inline-flex plasmo-items-center plasmo-gap-1 plasmo-bg-surface-elevated plasmo-border plasmo-border-border-highlight plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">
                                <ArrowUpRight className="plasmo-w-2.5 plasmo-h-2.5 plasmo-text-text-muted" strokeWidth={2.5} />
                                <span className="plasmo-text-caption plasmo-font-bold plasmo-text-text-muted">
                                  could be {formatAmount(reward + missed)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Amount — right-aligned */}
                      <div className="plasmo-text-right plasmo-shrink-0 plasmo-self-start">
                        <p className="plasmo-text-body plasmo-font-bold plasmo-tabular-nums plasmo-text-text-primary">
                          {formatAmount(tx.amount, tx.currency || "INR")}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── Load More ─────────────────────────────────────────────── */}
          {hasMore && (
            <div className="plasmo-text-center plasmo-py-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="plasmo-text-body plasmo-font-semibold plasmo-text-primary plasmo-bg-primary-soft plasmo-px-6 plasmo-py-2 plasmo-rounded-full plasmo-cursor-pointer hover:plasmo-bg-primary/10 plasmo-transition-colors disabled:plasmo-opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          INSIGHTS TAB — matches Expo insights section
          ══════════════════════════════════════════════════════════════════ */}
      {!isLoading && activeTab === "insights" && transactions.length > 0 && (
        <div className="plasmo-space-y-4">
          {/* ── Optimization Rate ──────────────────────────────────────── */}
          <div className="plasmo-p-3 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
            <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-2">
              <Target className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
              <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-secondary">
                Optimization Rate
              </span>
            </div>
            <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary">
              {optimizationRate}%
            </p>
            <p className="plasmo-text-caption plasmo-text-text-secondary plasmo-mt-1">
              {txWithRewards} of {transactions.length} transactions optimized
            </p>
          </div>

          {/* ── Spend / Saved side-by-side ────────────────────────────── */}
          <div className="plasmo-flex plasmo-gap-3">
            <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">
                Total Spend
              </p>
              <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary">
                {formatAmount(totalSpend)}
              </p>
            </div>
            <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-lg plasmo-bg-primary-soft plasmo-border plasmo-border-primary/20">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">
                Total Saved
              </p>
              <p className="plasmo-text-title plasmo-font-bold plasmo-text-primary">
                {formatAmount(totalRewards)}
              </p>
            </div>
          </div>

          {/* ── Rewards by Category — matches Expo CategoryRewardsChart ── */}
          {topRewardCategories.length > 0 && (
            <div className="plasmo-p-3 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-3">
                <PieChart className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary">
                  Rewards by Category
                </span>
              </div>
              {topRewardCategories.map(([cat, reward], idx) => {
                const CatIcon = getChartCategoryIcon(cat)
                return (
                  <div key={cat} className={idx > 0 ? "plasmo-mt-3" : ""}>
                    <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-1.5">
                      <div className="plasmo-flex plasmo-items-center plasmo-gap-2.5">
                        <div className="plasmo-w-7 plasmo-h-7 plasmo-rounded-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-flex plasmo-items-center plasmo-justify-center">
                          <CatIcon className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-text-primary" />
                        </div>
                        <span className="plasmo-text-body plasmo-font-medium plasmo-text-text-primary plasmo-capitalize">
                          {cat}
                        </span>
                      </div>
                      <span className="plasmo-text-body plasmo-font-bold plasmo-text-primary">
                        {formatAmount(Math.round(reward))}
                      </span>
                    </div>
                    {/* Animated progress bar */}
                    <div className="plasmo-w-full plasmo-h-1 plasmo-bg-background plasmo-rounded-full plasmo-overflow-hidden">
                      <div
                        className="plasmo-h-full plasmo-bg-primary plasmo-rounded-full"
                        style={{
                          width: `${((reward / maxReward) * 100).toFixed(0)}%`,
                          transition: "width 1s ease-out",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Reward Leakage — matches Expo RewardLeakageCard ────────── */}
          {leakageTransactions.length > 0 && (
            <div className="plasmo-p-3 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border plasmo-overflow-hidden">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-3">
                <AlertTriangle className="plasmo-w-4 plasmo-h-4 plasmo-text-danger" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-secondary">
                  Reward Leakage
                </span>
              </div>
              {leakageTransactions.map((tx, idx) => (
                <div
                  key={tx.id}
                  className={`plasmo-flex plasmo-justify-between plasmo-items-center plasmo-py-4 ${idx !== leakageTransactions.length - 1
                      ? "plasmo-border-b plasmo-border-border"
                      : ""
                    }`}
                >
                  <div className="plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-flex-1 plasmo-pr-4 plasmo-min-w-0">
                    <AlertTriangle className="plasmo-w-4 plasmo-h-4 plasmo-text-danger plasmo-shrink-0" />
                    <div className="plasmo-min-w-0">
                      <p className="plasmo-text-body plasmo-font-bold plasmo-text-text-primary">
                        {tx.merchant_name}
                      </p>
                      <p className="plasmo-text-caption plasmo-text-text-secondary plasmo-mt-0.5">
                        {tx.recommendation_reason ||
                          `Could have used ${tx.best_possible_card || "a better card"}`}
                      </p>
                    </div>
                  </div>
                  <div className="plasmo-text-right plasmo-shrink-0">
                    <p className="plasmo-text-body plasmo-font-bold plasmo-text-danger">
                      -{formatAmount(tx.missed_savings || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Generic warning when low optimization ──────────────────── */}
          {leakageTransactions.length === 0 &&
            txWithRewards < transactions.length * 0.5 && (
              <div className="plasmo-p-3 plasmo-rounded-lg plasmo-bg-warning-soft plasmo-border plasmo-border-warning/30">
                <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                  <AlertCircle className="plasmo-w-4 plasmo-h-4 plasmo-text-warning" />
                  <div>
                    <p className="plasmo-text-caption plasmo-font-semibold plasmo-text-warning">
                      Reward Leakage Detected
                    </p>
                    <p className="plasmo-text-caption plasmo-text-warning/70">
                      {transactions.length - txWithRewards} transactions not optimized. Use
                      Smart CC recommendations.
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Inject pulse-ring keyframes for the empty state animation */}
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
