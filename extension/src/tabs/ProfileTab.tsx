import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { getCards, getTransactions, getMonthlyIntelligence, logout } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import {
  ChevronRight,
  Bell,
  Settings,
  Shield,
  Monitor,
  Sun,
  Moon,
  LogOut,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react"

const storage = new Storage()

export function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [cardCount, setCardCount] = useState<number | null>(null)
  const [txCount, setTxCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ProfileSummaryCard data
  const [summaryData, setSummaryData] = useState<{
    optimizationRate: number | null
    lifetimeRewards: number
    bestCardName: string | null
    bestCardEff: number | null
  } | null>(null)

  // Theme state: "system" | "light" | "dark"
  const [themeMode, setThemeMode] = useState<"system" | "light" | "dark">("system")
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    // Load user + card count + tx count + monthly intelligence
    const now = new Date()
    Promise.all([
      storage.get("user"),
      getCards().catch(() => []),
      getTransactions().catch(() => []),
      getMonthlyIntelligence(now.getFullYear(), now.getMonth() + 1).catch(() => null),
    ]).then(([userData, cards, txs, monthly]) => {
      setUser(userData)
      const cardsArr = Array.isArray(cards) ? cards : []
      const txsArr = Array.isArray(txs) ? txs : []
      setCardCount(cardsArr.length)
      setTxCount(txsArr.length)

      // Calculate ProfileSummaryCard data
      const lifetimeRewards = txsArr.reduce(
        (sum: number, tx: any) => sum + (typeof tx?.reward_earned === "number" ? tx.reward_earned : 0),
        0,
      )
      const optimizationRate = monthly?.optimization_rate ?? null

      // Find best card by optimization_rate
      let bestCard: any = null
      if (cardsArr.length > 0) {
        bestCard = cardsArr.reduce((best: any, card: any) => {
          const currentRate = card.optimization_stats?.optimization_rate || 0
          const bestRate = best?.optimization_stats?.optimization_rate || 0
          return currentRate > bestRate ? card : best
        }, cardsArr[0])
      }

      setSummaryData({
        optimizationRate: optimizationRate != null ? Math.round(optimizationRate) : null,
        lifetimeRewards,
        bestCardName: bestCard
          ? bestCard.nickname || bestCard.card_details?.card_name || null
          : null,
        bestCardEff: bestCard?.optimization_stats?.optimization_rate != null
          ? Math.round(bestCard.optimization_stats.optimization_rate)
          : null,
      })

      setIsLoading(false)
    })

    // Load saved theme preference
    storage.get("theme_mode").then((saved) => {
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeMode(saved)
      }
    })
  }, [])

  // Listen for OS theme changes and react to themeMode changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const updateResolved = () => {
      if (themeMode === "system") {
        setResolvedTheme(mq.matches ? "dark" : "light")
      } else {
        setResolvedTheme(themeMode)
      }
    }
    updateResolved()
    mq.addEventListener("change", updateResolved)
    return () => mq.removeEventListener("change", updateResolved)
  }, [themeMode])

  const handleThemeChange = async (mode: "system" | "light" | "dark") => {
    setThemeMode(mode)
    await storage.set("theme_mode", mode)
  }

  const getInitials = () => {
    const name = user?.full_name || user?.name || ""
    if (name && name !== "User" && name !== "Smart CC User") {
      const parts = name.trim().split(" ")
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      return name.substring(0, 2).toUpperCase()
    }
    return user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"
  }

  const handleLogout = async () => {
    await logout()
    onLogout()
  }

  const formatCurrency = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
    return `₹${val}`
  }

  // ── Settings Row component ───────────────────────────────────────────
  const SettingsRow = ({
    icon: Icon,
    label,
    onClick,
    danger,
  }: {
    icon: any
    label: string
    onClick?: () => void
    danger?: boolean
  }) => (
    <button
      onClick={onClick || (() => {})}
      className={`plasmo-w-full plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-p-3 plasmo-transition-colors ${
        danger
          ? "plasmo-bg-transparent hover:plasmo-bg-danger-soft"
          : "plasmo-bg-transparent hover:plasmo-bg-background"
      }`}
    >
      <div
        className={`plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center ${
          danger ? "plasmo-bg-danger-soft" : "plasmo-bg-surface-elevated"
        }`}
      >
        <Icon className={`plasmo-w-[18px] plasmo-h-[18px] ${danger ? "plasmo-text-danger" : "plasmo-text-text-secondary"}`} />
      </div>
      <span
        className={`plasmo-flex-1 plasmo-text-left plasmo-text-body-lg plasmo-font-medium ${
          danger ? "plasmo-text-danger" : "plasmo-text-text-primary"
        }`}
      >
        {label}
      </span>
      {!danger && <ChevronRight className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-text-muted" />}
    </button>
  )

  // ── Theme Pill component ─────────────────────────────────────────────
  const ThemePill = ({
    mode,
    icon: Icon,
    label,
    isActive,
  }: {
    mode: "system" | "light" | "dark"
    icon: any
    label: string
    isActive: boolean
  }) => (
    <button
      onClick={() => handleThemeChange(mode)}
      className={`plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-1.5 plasmo-py-2.5 plasmo-rounded-full plasmo-transition-colors ${
        isActive
          ? "plasmo-bg-primary-soft plasmo-border plasmo-border-primary"
          : "plasmo-text-text-muted hover:plasmo-text-text-secondary"
      }`}
    >
      <Icon className={`plasmo-w-3.5 plasmo-h-3.5 ${isActive ? "plasmo-text-primary" : "plasmo-text-text-muted"}`} />
      <span
        className={`plasmo-text-caption ${
          isActive ? "plasmo-text-primary plasmo-font-bold" : "plasmo-text-text-muted plasmo-font-medium"
        }`}
      >
        {label}
      </span>
    </button>
  )

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-4">
      {/* ── Profile Header / Avatar ────────────────────────────────────── */}
      <div className="plasmo-text-center plasmo-mb-6 plasmo-mt-4">
        {/* Avatar — gradient circle matching Expo */}
        <div
          className="plasmo-w-16 plasmo-h-16 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4"
          style={{
            background: "linear-gradient(135deg, #4F36FF, #8B5CF6)",
            boxShadow: "0 6px 20px rgba(79, 54, 255, 0.14)",
          }}
        >
          <span className="plasmo-text-display plasmo-font-extrabold plasmo-text-white plasmo-tracking-wide">
            {getInitials()}
          </span>
        </div>

        <h2 className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary plasmo-mb-0">
          {user?.full_name || user?.name || user?.email || "Smart CC User"}
        </h2>

        {/* Stats Bar — Cards + Transactions */}
        <div className="plasmo-inline-flex plasmo-items-center plasmo-rounded-full plasmo-border plasmo-border-border-highlight plasmo-py-3 plasmo-px-6 plasmo-mt-4 plasmo-bg-surface">
          <div className="plasmo-text-center plasmo-px-4">
            {isLoading ? (
              <SkeletonBox width="24px" height="28px" className="plasmo-mx-auto plasmo-mb-1" />
            ) : (
              <p className="plasmo-text-headline plasmo-font-bold plasmo-text-text-primary">{cardCount ?? 0}</p>
            )}
            <p className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted">
              Cards
            </p>
          </div>
          <div className="plasmo-w-px plasmo-h-6 plasmo-bg-border-highlight" />
          <div className="plasmo-text-center plasmo-px-4">
            {isLoading ? (
              <SkeletonBox width="24px" height="28px" className="plasmo-mx-auto plasmo-mb-1" />
            ) : (
              <p className="plasmo-text-headline plasmo-font-bold plasmo-text-text-primary">{txCount ?? 0}</p>
            )}
            <p className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted">
              Transactions
            </p>
          </div>
        </div>
      </div>

      {/* ── Profile Summary Card — matches Expo ProfileSummaryCard ──────── */}
      <div className="plasmo-mb-5">
        <div className="plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
          <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-3">
            Your Summary
          </p>

          {/* Reward Efficiency Row */}
          <div className="plasmo-flex plasmo-items-center plasmo-py-3 plasmo-gap-3.5">
            <div className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0"
              style={{ backgroundColor: "#F59E0B" + "15" }}>
              <Target className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-warning" strokeWidth={1.5} />
            </div>
            <div className="plasmo-flex-1">
              <p className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary plasmo-mb-0.5">Reward Efficiency</p>
              <div className="plasmo-flex plasmo-items-baseline plasmo-gap-2">
                {isLoading ? (
                  <SkeletonBox width="50px" height="20px" />
                ) : (
                  <p className="plasmo-text-title plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary">
                    {summaryData?.optimizationRate != null ? `${summaryData.optimizationRate}%` : "—"}
                  </p>
                )}
                {summaryData?.optimizationRate != null && (
                  <span className="plasmo-text-caption plasmo-font-semibold plasmo-text-success">this month</span>
                )}
              </div>
            </div>
          </div>

          <div className="plasmo-h-px plasmo-bg-border" />

          {/* Lifetime Rewards Row */}
          <div className="plasmo-flex plasmo-items-center plasmo-py-3 plasmo-gap-3.5">
            <div className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0"
              style={{ backgroundColor: "#22C55E" + "15" }}>
              <TrendingUp className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-success" strokeWidth={1.5} />
            </div>
            <div className="plasmo-flex-1">
              <p className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary plasmo-mb-0.5">Lifetime Rewards</p>
              {isLoading ? (
                <SkeletonBox width="60px" height="20px" />
              ) : (
                <p className="plasmo-text-title plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary">
                  {summaryData && summaryData.lifetimeRewards > 0 ? formatCurrency(summaryData.lifetimeRewards) : "—"}
                </p>
              )}
            </div>
          </div>

          {summaryData?.bestCardName && (
            <>
              <div className="plasmo-h-px plasmo-bg-border" />
              {/* Best Card Row */}
              <div className="plasmo-flex plasmo-items-center plasmo-py-2 plasmo-gap-3.5">
                <div className="plasmo-w-10 plasmo-h-10 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0"
                  style={{ backgroundColor: "#4F36FF" + "15" }}>
                  <Trophy className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-primary" strokeWidth={1.5} />
                </div>
                <div className="plasmo-flex-1">
                  <p className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary plasmo-mb-0.5">Best Card</p>
                  <div className="plasmo-flex plasmo-items-baseline plasmo-gap-2">
                    <p className="plasmo-text-title plasmo-font-bold plasmo-tracking-tight plasmo-text-text-primary">
                      {summaryData.bestCardName}
                    </p>
                    {summaryData.bestCardEff != null && (
                      <span className="plasmo-text-caption plasmo-font-semibold plasmo-text-success">
                        {summaryData.bestCardEff}% eff.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Theme Settings — matches Expo Appearance section ────────────── */}
      <div className="plasmo-mb-5">
        <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-3 plasmo-ml-4">
          Appearance
        </p>
        <div className="plasmo-flex plasmo-rounded-full plasmo-border plasmo-border-border plasmo-p-1 plasmo-gap-1 plasmo-bg-surface">
          <ThemePill mode="system" icon={Monitor} label="System" isActive={themeMode === "system"} />
          <ThemePill mode="light" icon={Sun} label="Light" isActive={themeMode === "light"} />
          <ThemePill mode="dark" icon={Moon} label="Dark" isActive={themeMode === "dark"} />
        </div>
      </div>

      {/* ── Account Settings ────────────────────────────────────────────── */}
      <div className="plasmo-mb-5">
        <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-3 plasmo-ml-4">
          Account
        </p>
        <div className="plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-overflow-hidden plasmo-divide-y plasmo-divide-border">
          <SettingsRow icon={Bell} label="Notifications" onClick={() => alert("Notifications settings coming soon")} />
          <SettingsRow icon={Settings} label="Preferences" onClick={() => alert("Preferences settings coming soon")} />
          <SettingsRow icon={Shield} label="Security" onClick={() => alert("Security settings coming soon")} />
        </div>
      </div>

      {/* ── Danger Zone / Sign Out ──────────────────────────────────────── */}
      <div className="plasmo-mb-5">
        <div className="plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-overflow-hidden">
          <SettingsRow icon={LogOut} label="Sign Out" onClick={handleLogout} danger />
        </div>
      </div>

      {/* ── Version ─────────────────────────────────────────────────────── */}
      <p className="plasmo-text-center plasmo-text-caption plasmo-font-medium plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mt-5 plasmo-mb-10">
        Card Optimizer • v1.0.0
      </p>
    </div>
  )
}
