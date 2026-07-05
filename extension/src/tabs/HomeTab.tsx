import { useEffect, useState } from "react"
import { getMonthlyIntelligence, getSpendInsights, getCards } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import { Sparkles, Trophy, TrendingUp, ChevronRight, Lightbulb, RefreshCw, Plus, CreditCard } from "lucide-react"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

interface HomeTabProps {
  onTabChange?: (tab: string) => void
}

export function HomeTab({ onTabChange }: HomeTabProps) {
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [cardCount, setCardCount] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const loadDashboard = async () => {
    setIsLoading(true); setError(null)
    try {
      const [monthly, ins, cards] = await Promise.all([
        getMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1).catch(() => null),
        getSpendInsights().catch(() => []),
        getCards().catch(() => []),
      ])
      setMonthlyData(monthly)
      setInsights(Array.isArray(ins) ? ins : ins?.insights || [])
      setCardCount(Array.isArray(cards) ? cards.length : 0)
    } catch (err: any) { setError(err.message) }
    finally { setIsLoading(false); setIsRefreshing(false) }
  }

  useEffect(() => { loadDashboard() }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadDashboard()
  }

  const primaryInsight = insights?.[0]
  const hasStats = monthlyData && (monthlyData.total_rewards_optimized > 0 || monthlyData.optimization_rate > 0)

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-4">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="plasmo-mb-5">
        <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
          <div>
            <h2 className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-1.5">{getGreeting()}</h2>
            <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary">Your proactive financial assistant.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-bg-surface plasmo-border plasmo-border-border plasmo-flex plasmo-items-center plasmo-justify-center plasmo-cursor-pointer hover:plasmo-bg-primary-soft plasmo-transition-colors"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`plasmo-w-4 plasmo-h-4 plasmo-text-text-secondary ${isRefreshing ? "plasmo-animate-spin" : ""}`} />
          </button>
        </div>

        {/* Intelligence Banner — visual card, no navigation in extension */}
        <div className="plasmo-mt-6 plasmo-flex plasmo-items-center plasmo-gap-4 plasmo-bg-primary-soft plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-3">
          <div className="plasmo-bg-surface plasmo-w-8 plasmo-h-8 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
            <Sparkles className="plasmo-w-5 plasmo-h-5 plasmo-text-primary" />
          </div>
          <div className="plasmo-flex-1">
            <p className="plasmo-text-body plasmo-font-bold plasmo-text-text-primary">Monthly Intelligence</p>
            <p className="plasmo-text-caption plasmo-text-text-secondary">Your portfolio analysis is ready</p>
          </div>
          <div className="plasmo-bg-surface plasmo-w-8 plasmo-h-8 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
            <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
          </div>
        </div>
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && !isLoading && (
        <ErrorBanner message={error} onRetry={handleRefresh} />
      )}

      {/* ── Loading Skeleton ────────────────────────────────────────────── */}
      {isLoading && (
        <div className="plasmo-space-y-2">
          <div className="plasmo-flex plasmo-gap-3">
            {[1, 2].map(i => (
              <div key={i} className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
                <SkeletonBox width="60%" height="12px" className="plasmo-mb-2" />
                <SkeletonBox width="40%" height="28px" />
              </div>
            ))}
          </div>
          <div className="plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <SkeletonBox width="40%" height="14px" className="plasmo-mb-2" /><SkeletonBox width="30%" height="20px" />
          </div>
          <div className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <SkeletonBox width="35%" height="12px" className="plasmo-mb-4" />
            <SkeletonBox width="90%" height="16px" className="plasmo-mb-2" /><SkeletonBox width="70%" height="12px" />
          </div>
        </div>
      )}

      {/* ── Empty Dashboard State — contextual by card presence ── */}
      {!isLoading && !hasStats && !primaryInsight && (
        <div className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
          <div className="plasmo-text-center plasmo-mb-6">
            <div className="plasmo-w-14 plasmo-h-14 plasmo-rounded-full plasmo-bg-primary-soft plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-5">
              <Sparkles className="plasmo-w-6 plasmo-h-6 plasmo-text-primary" />
            </div>
            <h3 className="plasmo-text-title plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-2.5">
              {cardCount > 0 ? 'Ready to earn rewards' : 'Your dashboard awaits'}
            </h3>
            <p className="plasmo-text-body plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-leading-relaxed">
              {cardCount > 0
                ? "Your card is set up! Log your first transaction to see cashback, reward efficiency, and personalized card recommendations."
                : "Add a credit card and log your first transaction. Card Optimizer will analyze your portfolio and recommend the best card for every purchase — automatically."}
            </p>
          </div>
          <div className="plasmo-space-y-2">
            {cardCount === 0 && (
              <button
                onClick={() => onTabChange?.("wallet")}
                className="plasmo-w-full plasmo-bg-primary plasmo-text-white plasmo-py-2.5 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-2"
              >
                <Plus className="plasmo-w-5 plasmo-h-5" strokeWidth={2.5} />
                Add a Card
              </button>
            )}
            <button
              onClick={() => onTabChange?.("activity")}
              className={`plasmo-w-full plasmo-py-2.5 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer plasmo-transition-colors plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-2 ${cardCount > 0 ? 'plasmo-bg-primary plasmo-text-white hover:plasmo-bg-primary-dark' : 'plasmo-bg-surface plasmo-text-text-secondary hover:plasmo-bg-background plasmo-border plasmo-border-border'}`}
            >
              <CreditCard className="plasmo-w-5 plasmo-h-5" strokeWidth={cardCount > 0 ? 2.5 : 2} />
              Log a Transaction
            </button>
          </div>
        </div>
      )}

      {/* ── Intelligence Cards Section ──────────────────────────────────── */}
      {!isLoading && hasStats && (
        <div className="plasmo-space-y-2 plasmo-mb-5">
          {/* Stats Row */}
          <div className="plasmo-flex plasmo-gap-3">
            {/* Reward Efficiency */}
            <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-2">
                <Trophy className="plasmo-w-4 plasmo-h-4 plasmo-text-warning" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-secondary">Reward Efficiency</span>
              </div>
              <p className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary">{(monthlyData?.optimization_rate || 0).toFixed(1)}%</p>
            </div>
            {/* Rewards — bento style with success background */}
            <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-card plasmo-bg-success-soft plasmo-border plasmo-border-success/20">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-2">
                <TrendingUp className="plasmo-w-4 plasmo-h-4 plasmo-text-success" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-primary">Rewards</span>
              </div>
              <p className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-success">₹{(monthlyData?.total_rewards_optimized || 0).toFixed(0)}</p>
            </div>
          </div>

          {/* Best Category — static card (no sub-navigation in extension) */}
          {!!monthlyData?.strongest_category && (
            <div className="plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border plasmo-flex plasmo-justify-between plasmo-items-center">
              <span className="plasmo-text-body plasmo-font-semibold plasmo-text-text-secondary">Best Category</span>
              <span className="plasmo-text-caption plasmo-font-bold plasmo-text-success plasmo-bg-success-soft plasmo-px-3 plasmo-py-1 plasmo-rounded-full plasmo-capitalize">{monthlyData.strongest_category}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Recent Recommendation Section — matches Expo insight card exactly ── */}
      {!isLoading && primaryInsight && (
        <div className="plasmo-mb-5">
          <p className="plasmo-text-caption plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-3 plasmo-ml-1">Recent Recommendation</p>
          <div
            className="plasmo-p-5 plasmo-rounded-card plasmo-border plasmo-border-border plasmo-cursor-pointer hover:plasmo-border-primary/30 plasmo-transition-colors"
            style={{
              backgroundColor: (primaryInsight.badge_color || "#4F36FF") + "0A",
              borderLeftWidth: "4px",
              borderLeftColor: primaryInsight.badge_color || "#4F36FF",
            }}
          >
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2.5">
                <Lightbulb className="plasmo-w-[18px] plasmo-h-[18px]" style={{ color: primaryInsight.badge_color }} />
                <div
                  className="plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wide"
                  style={{
                    backgroundColor: (primaryInsight.badge_color || "#4F36FF") + "15",
                    color: primaryInsight.badge_color,
                  }}
                >
                  {primaryInsight.badge_label}
                </div>
              </div>
              <ChevronRight className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-text-secondary" />
            </div>
            <p className="plasmo-text-body-lg plasmo-font-bold plasmo-text-text-primary plasmo-mb-1.5">{primaryInsight.title}</p>
            <p className="plasmo-text-body plasmo-text-text-secondary plasmo-leading-relaxed">{primaryInsight.summary}</p>
          </div>
        </div>
      )}

      {/* ── Primary Action Button — show when has stats OR user has cards ── */}
      {!isLoading && (hasStats || cardCount > 0) && (
        <div className="plasmo-text-center plasmo-mt-2 plasmo-py-6 plasmo-px-4">
          <button
            onClick={() => onTabChange?.("activity")}
            className="plasmo-w-full plasmo-bg-primary plasmo-text-white plasmo-py-2.5 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-3"
          >
            <Plus className="plasmo-w-6 plasmo-h-6" strokeWidth={2.5} />
            Add Transaction
          </button>
          <p className="plasmo-mt-4 plasmo-text-body plasmo-text-text-secondary plasmo-leading-relaxed">
            Get instant, live recommendations based on your portfolio.
          </p>
        </div>
      )}
    </div>
  )
}
