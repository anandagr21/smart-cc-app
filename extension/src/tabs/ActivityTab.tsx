import { useEffect, useState } from "react"
import { getTransactions } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import { LayoutList, BarChart3, Trophy, TrendingUp, Plus, History, ShoppingBag, Coffee, Zap, Target, PieChart, AlertCircle } from "lucide-react"

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

function getCategoryIcon(merchant: string) {
  const m = (merchant || "").toLowerCase()
  if (m.includes("swiggy") || m.includes("zomato") || m.includes("food")) return Coffee
  if (m.includes("amazon") || m.includes("flipkart") || m.includes("myntra")) return ShoppingBag
  if (m.includes("uber") || m.includes("ola")) return Zap
  return ShoppingBag
}

export function ActivityTab() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"activity" | "insights">("activity")

  const loadData = async () => {
    setIsLoading(true); setError(null)
    try { const data = await getTransactions(); setTransactions(Array.isArray(data) ? data : data?.transactions || []) }
    catch (err: any) { setError(err.message) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const grouped = groupByDate(transactions)
  const totalSpend = transactions.reduce((s, t) => s + (t.amount || 0), 0)
  const totalSavings = transactions.reduce((s, t) => s + (t.savings || 0), 0)
  const txWithSavings = transactions.filter(t => t.savings > 0).length
  const optimizationRate = transactions.length > 0 ? Math.round((txWithSavings / transactions.length) * 100) : 0

  const categorySpend: Record<string, number> = {}
  transactions.forEach(tx => { const cat = tx.merchant_name || "Other"; categorySpend[cat] = (categorySpend[cat] || 0) + (tx.amount || 0) })
  const topCategories = Object.entries(categorySpend).sort(([, a], [, b]) => b - a).slice(0, 4)

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-6">
      {/* Header */}
      <div className="plasmo-flex plasmo-justify-between plasmo-items-start plasmo-mb-6">
        <div>
          <h2 className="plasmo-text-display plasmo-font-extrabold plasmo-tracking-tightest plasmo-text-text-primary plasmo-mb-1">Activity</h2>
          <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary">Your spending intelligence</p>
        </div>
        {transactions.length > 0 && (
          <button onClick={loadData} className="plasmo-w-12 plasmo-h-12 plasmo-rounded-full plasmo-bg-primary plasmo-border plasmo-border-primary plasmo-flex plasmo-items-center plasmo-justify-center plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors">
            <Plus className="plasmo-w-5.5 plasmo-h-5.5 plasmo-text-white" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Segmented Control */}
      {transactions.length > 0 && (
        <div className="plasmo-flex plasmo-bg-surface-elevated plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-1 plasmo-mb-6">
          <button onClick={() => setActiveTab("activity")}
            className={`plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1.5 plasmo-py-2.5 plasmo-rounded-md plasmo-text-body plasmo-font-semibold plasmo-transition-all ${activeTab === "activity" ? "plasmo-bg-surface plasmo-text-text-primary plasmo-border plasmo-border-border plasmo-shadow-sm" : "plasmo-text-text-secondary hover:plasmo-text-text-primary"}`}>
            <LayoutList className="plasmo-w-3.5 plasmo-h-3.5" strokeWidth={2} />Activity
          </button>
          <button onClick={() => setActiveTab("insights")}
            className={`plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1.5 plasmo-py-2.5 plasmo-rounded-md plasmo-text-body plasmo-font-semibold plasmo-transition-all ${activeTab === "insights" ? "plasmo-bg-surface plasmo-text-text-primary plasmo-border plasmo-border-border plasmo-shadow-sm" : "plasmo-text-text-secondary hover:plasmo-text-text-primary"}`}>
            <BarChart3 className="plasmo-w-3.5 plasmo-h-3.5" strokeWidth={2} />Insights
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {isLoading && (
        <div className="plasmo-space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-4">
              <SkeletonBox width="44px" height="44px" className="plasmo-rounded-full" />
              <div className="plasmo-flex-1"><SkeletonBox width="50%" height="16px" className="plasmo-mb-2" /><SkeletonBox width="30%" height="12px" /></div>
              <SkeletonBox width="60px" height="16px" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && transactions.length === 0 && (
        <div className="plasmo-text-center plasmo-py-16">
          <div className="plasmo-w-[120px] plasmo-h-[120px] plasmo-relative plasmo-mx-auto plasmo-mb-8">
            <div className="plasmo-absolute plasmo-inset-0 plasmo-rounded-full plasmo-border plasmo-border-primary plasmo-animate-ping" style={{ animationDuration: "1.4s" }} />
            <div className="plasmo-absolute plasmo-inset-0 plasmo-rounded-full plasmo-bg-surface plasmo-border plasmo-border-border-highlight plasmo-flex plasmo-items-center plasmo-justify-center">
              <History className="plasmo-w-9 plasmo-h-9 plasmo-text-text-muted" strokeWidth={1.5} />
            </div>
          </div>
          <p className="plasmo-text-headline plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary plasmo-mb-3">No Activity Yet</p>
          <p className="plasmo-text-body-lg plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-mb-8 plasmo-leading-relaxed">Log your transactions to see AI-driven insights and track your optimized rewards over time.</p>
          <button onClick={loadData} className="plasmo-bg-primary-soft plasmo-text-primary plasmo-py-3 plasmo-px-8 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary/10 plasmo-transition-colors">Log a Transaction</button>
        </div>
      )}

      {!isLoading && activeTab === "activity" && transactions.length > 0 && (
        <div>
          {/* Savings Summary Card — matches Expo "Reward Pulse" */}
          {totalSavings > 0 && (
            <div className="plasmo-relative plasmo-mb-6">
              <div className="plasmo-p-6 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border plasmo-overflow-hidden plasmo-relative">
                <div className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-[3px] plasmo-bg-success" style={{ opacity: 0.7 }} />
                <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-5">
                  <div className="plasmo-w-7 plasmo-h-7 plasmo-rounded-full plasmo-bg-success-soft plasmo-flex plasmo-items-center plasmo-justify-center">
                    <Trophy className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-success" strokeWidth={2} />
                  </div>
                  <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-success">Optimization Summary</span>
                </div>
                <p className="plasmo-text-body-lg plasmo-text-text-secondary plasmo-mb-1">You optimized</p>
                <p className="plasmo-text-hero plasmo-font-extrabold plasmo-tracking-tightest plasmo-text-text-primary plasmo-mb-5">₹{Math.round(totalSavings)}</p>
                <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-bg-success-soft plasmo-border plasmo-border-success/25 plasmo-px-3 plasmo-py-1.5 plasmo-rounded-full plasmo-self-start plasmo-inline-flex">
                  <TrendingUp className="plasmo-w-3 plasmo-h-3 plasmo-text-success" />
                  <span className="plasmo-text-caption plasmo-font-medium plasmo-text-success">Best optimization: <span className="plasmo-font-bold plasmo-capitalize">Shopping</span></span>
                </div>
              </div>
            </div>
          )}

          {grouped.map(([dateLabel, txs]) => (
            <div key={dateLabel} className="plasmo-mb-4">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-text-text-muted plasmo-uppercase plasmo-tracking-widest plasmo-mb-2.5 plasmo-px-0">{dateLabel}</p>
              <div className="plasmo-space-y-3">
                {txs.map((tx: any) => {
                  const Icon = getCategoryIcon(tx.merchant_name)
                  return (
                    <div key={tx.id} className="plasmo-flex plasmo-items-center plasmo-gap-4 plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-4 plasmo-overflow-hidden plasmo-relative hover:plasmo-border-primary/20 plasmo-cursor-pointer plasmo-transition-colors">
                      <div className="plasmo-absolute plasmo-left-0 plasmo-top-0 plasmo-bottom-0 plasmo-w-[3px] plasmo-bg-text-muted/30" />
                      <div className="plasmo-w-11 plasmo-h-11 plasmo-rounded-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0">
                        <Icon className="plasmo-w-5 plasmo-h-5 plasmo-text-text-secondary" strokeWidth={1.5} />
                      </div>
                      <div className="plasmo-flex-1 plasmo-min-w-0">
                        <p className="plasmo-text-body-lg plasmo-font-semibold plasmo-text-text-primary plasmo-capitalize">{tx.merchant_name || "Shopping"}</p>
                        <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mt-0.5">
                          {tx.card_name && <span className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary">{tx.card_name}</span>}
                          <span className="plasmo-text-caption plasmo-text-text-muted">{new Date(tx.transaction_date || tx.created_at).toLocaleDateString()}</span>
                        </div>
                        {tx.savings > 0 && <p className="plasmo-text-caption plasmo-font-bold plasmo-text-primary plasmo-mt-1">+₹{Math.round(tx.savings)} saved</p>}
                      </div>
                      <div className="plasmo-text-right plasmo-shrink-0">
                        <p className="plasmo-text-body-lg plasmo-font-bold plasmo-tabular-nums plasmo-text-text-primary">₹{tx.amount}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && activeTab === "insights" && transactions.length > 0 && (
        <div className="plasmo-space-y-4">
          <div className="plasmo-p-4 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
            <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-2">
              <Target className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
              <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-secondary">Optimization Rate</span>
            </div>
            <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary">{optimizationRate}%</p>
            <p className="plasmo-text-caption plasmo-text-text-secondary plasmo-mt-1">{txWithSavings} of {transactions.length} transactions optimized</p>
          </div>

          <div className="plasmo-flex plasmo-gap-3">
            <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">Total Spend</p>
              <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary">₹{Math.round(totalSpend)}</p>
            </div>
            <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-lg plasmo-bg-primary-soft plasmo-border plasmo-border-primary/20">
              <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">Total Saved</p>
              <p className="plasmo-text-title plasmo-font-bold plasmo-text-primary">₹{Math.round(totalSavings)}</p>
            </div>
          </div>

          {topCategories.length > 0 && (
            <div className="plasmo-p-4 plasmo-rounded-lg plasmo-bg-surface plasmo-border plasmo-border-border">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-3">
                <PieChart className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
                <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary">Top Categories</span>
              </div>
              {topCategories.map(([cat, spend], idx) => (
                <div key={cat} className="plasmo-mb-2">
                  <div className="plasmo-flex plasmo-justify-between plasmo-text-body plasmo-mb-1"><span className="plasmo-text-text-primary plasmo-capitalize">{cat}</span><span className="plasmo-font-medium plasmo-text-text-secondary">₹{Math.round(spend)}</span></div>
                  <div className="plasmo-w-full plasmo-h-1.5 plasmo-bg-background plasmo-rounded-full plasmo-overflow-hidden">
                    <div className="plasmo-h-full plasmo-bg-primary plasmo-rounded-full" style={{ width: `${((spend / topCategories[0][1]) * 100).toFixed(0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {txWithSavings < transactions.length * 0.5 && (
            <div className="plasmo-p-4 plasmo-rounded-lg plasmo-bg-warning-soft plasmo-border plasmo-border-warning/30">
              <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                <AlertCircle className="plasmo-w-4 plasmo-h-4 plasmo-text-warning" />
                <div>
                  <p className="plasmo-text-caption plasmo-font-semibold plasmo-text-warning">Reward Leakage Detected</p>
                  <p className="plasmo-text-caption plasmo-text-warning/70">{transactions.length - txWithSavings} transactions not optimized. Use Smart CC recommendations.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
