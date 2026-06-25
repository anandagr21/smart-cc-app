import { useEffect, useState } from "react"
import { getMonthlyIntelligence, getSpendInsights } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import { Sparkles, Trophy, TrendingUp, ChevronRight, Lightbulb } from "lucide-react"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export function HomeTab() {
  const [monthlyData, setMonthlyData] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const now = new Date()
  const loadDashboard = async () => {
    setIsLoading(true); setError(null)
    try {
      const [monthly, ins] = await Promise.all([
        getMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1).catch(() => null),
        getSpendInsights().catch(() => []),
      ])
      setMonthlyData(monthly)
      setInsights(Array.isArray(ins) ? ins : ins?.insights || [])
    } catch (err: any) { setError(err.message) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { loadDashboard() }, [])

  const primaryInsight = insights?.[0]
  const hasStats = monthlyData && (monthlyData.total_rewards_optimized > 0 || monthlyData.optimization_rate > 0)

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-6">
      {/* Header */}
      <div className="plasmo-mb-8">
        <h2 className="plasmo-text-display plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-1.5">{getGreeting()}</h2>
        <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary">Your proactive financial assistant.</p>

        <div onClick={loadDashboard}
          className="plasmo-mt-6 plasmo-flex plasmo-items-center plasmo-gap-4 plasmo-bg-primary-soft plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-4 plasmo-cursor-pointer hover:plasmo-border-primary/30 plasmo-transition-colors">
          <div className="plasmo-bg-surface plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center">
            <Sparkles className="plasmo-w-5 plasmo-h-5 plasmo-text-primary" />
          </div>
          <div className="plasmo-flex-1">
            <p className="plasmo-text-body plasmo-font-bold plasmo-text-text-primary">Monthly Intelligence</p>
            <p className="plasmo-text-caption plasmo-text-text-secondary">Tap to view your detailed portfolio analysis</p>
          </div>
          <ChevronRight className="plasmo-w-5 plasmo-h-5 plasmo-text-text-secondary" />
        </div>
      </div>

      {error && !isLoading && <ErrorBanner message={error} onRetry={loadDashboard} />}

      {isLoading && (
        <div className="plasmo-space-y-3">
          <div className="plasmo-flex plasmo-gap-3">
            {[1, 2].map(i => (
              <div key={i} className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
                <SkeletonBox width="60%" height="12px" className="plasmo-mb-2" />
                <SkeletonBox width="40%" height="28px" />
              </div>
            ))}
          </div>
          <div className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <SkeletonBox width="40%" height="14px" className="plasmo-mb-2" /><SkeletonBox width="30%" height="20px" />
          </div>
          <div className="plasmo-p-5 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <SkeletonBox width="35%" height="12px" className="plasmo-mb-4" />
            <SkeletonBox width="90%" height="16px" className="plasmo-mb-2" /><SkeletonBox width="70%" height="12px" />
          </div>
        </div>
      )}

      {!isLoading && hasStats && (
        <div className="plasmo-space-y-3 plasmo-mb-7">
          <div className="plasmo-flex plasmo-gap-3">
            <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-2">
                <Trophy className="plasmo-w-4 plasmo-h-4 plasmo-text-warning" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-secondary">Reward Efficiency</span>
              </div>
              <p className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary">{(monthlyData?.optimization_rate || 0).toFixed(1)}%</p>
            </div>
            <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-card plasmo-bg-success-soft plasmo-border plasmo-border-success/20">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-2">
                <TrendingUp className="plasmo-w-4 plasmo-h-4 plasmo-text-success" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-primary">Rewards</span>
              </div>
              <p className="plasmo-text-headline plasmo-font-extrabold plasmo-tracking-tight plasmo-text-success">₹{(monthlyData?.total_rewards_optimized || 0).toFixed(0)}</p>
            </div>
          </div>
          {monthlyData?.strongest_category && (
            <div className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border plasmo-flex plasmo-justify-between plasmo-items-center">
              <span className="plasmo-text-body plasmo-font-semibold plasmo-text-text-secondary">Best Category</span>
              <span className="plasmo-text-caption plasmo-font-bold plasmo-text-success plasmo-bg-success-soft plasmo-px-3 plasmo-py-1 plasmo-rounded-full plasmo-capitalize">{monthlyData.strongest_category}</span>
            </div>
          )}
        </div>
      )}

      {!isLoading && !hasStats && !primaryInsight && (
        <div className="plasmo-text-center plasmo-py-10">
          <div className="plasmo-w-14 plasmo-h-14 plasmo-rounded-full plasmo-bg-primary-soft plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-5">
            <Sparkles className="plasmo-w-6 plasmo-h-6 plasmo-text-primary" />
          </div>
          <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary plasmo-mb-2.5">Your dashboard awaits</p>
          <p className="plasmo-text-body plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-leading-relaxed">Add a credit card and log your first transaction. Smart CC will analyze your portfolio and recommend the best card for every purchase — automatically.</p>
        </div>
      )}

      {!isLoading && primaryInsight && (
        <div className="plasmo-mb-7">
          <p className="plasmo-text-caption plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-3 plasmo-ml-1">Recent Recommendation</p>
          <div className="plasmo-p-5 plasmo-rounded-card plasmo-border plasmo-border-border plasmo-cursor-pointer hover:plasmo-border-primary/30 plasmo-transition-colors"
            style={{ backgroundColor: (primaryInsight.badge_color || "#4F36FF") + "0A", borderLeftWidth: "4px", borderLeftColor: primaryInsight.badge_color || "#4F36FF" }}>
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2.5">
                <Lightbulb className="plasmo-w-[18px] plasmo-h-[18px]" style={{ color: primaryInsight.badge_color }} />
                <div className="plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-text-micro plasmo-font-bold plasmo-uppercase" style={{ backgroundColor: (primaryInsight.badge_color || "#4F36FF") + "15", color: primaryInsight.badge_color }}>{primaryInsight.badge_label}</div>
              </div>
              <ChevronRight className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-text-secondary" />
            </div>
            <p className="plasmo-text-body-lg plasmo-font-bold plasmo-text-text-primary plasmo-mb-1.5">{primaryInsight.title}</p>
            <p className="plasmo-text-body plasmo-text-text-secondary plasmo-leading-relaxed">{primaryInsight.summary}</p>
          </div>
        </div>
      )}
    </div>
  )
}
