import { useEffect, useState, useMemo, useRef } from "react"
import {
  getCards,
  getCardCatalog,
  addCard,
  removeCard,
  getPersonalitySnapshot,
  getSpendInsights,
} from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import {
  CreditCard,
  Search,
  Brain,
  ChevronRight,
  Plus,
  X,
  ArrowLeft,
  Wallet,
  Wifi,
  Loader2,
  Building2,
  Sparkles,
  Zap,
  Plane,
  ShoppingBag,
  Fuel,
  Utensils,
  Activity,
  Trophy,
  Calendar,
  Pencil,
  Trash2,
  FileText,
  Focus,
} from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrencyIN(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 10000000) return "₹" + (abs / 10000000).toFixed(2) + "Cr"
  if (abs >= 100000) return "₹" + (abs / 100000).toFixed(1) + "L"
  if (abs >= 1000) return "₹" + (abs / 1000).toFixed(0) + "k"
  return "₹" + abs.toLocaleString("en-IN")
}

function formatCompactIN(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 100000) return "₹" + (abs / 100000).toFixed(1) + "L"
  if (abs >= 1000) return "₹" + (abs / 1000).toFixed(0) + "k"
  return "₹" + abs.toLocaleString("en-IN")
}

const networkColors: Record<string, string> = {
  visa: "#1E3A8A",
  mastercard: "#881337",
  amex: "#1E3A8A",
  discover: "#9A3412",
  rupay: "#9A3412",
  default: "#334155",
}

// Normalize bank name variations (SBI Card / SBI Cards and Payment Services → State Bank of India)
function normalizeBank(name: string): string {
  const n = (name || "").toLowerCase().trim()
  if (n.includes("sbi") || n.includes("state bank")) return "State Bank of India"
  return name
}

function getNetworkGradient(
  network: string,
  isDark: boolean,
): [string, string] {
  const color = networkColors[(network || "default").toLowerCase()] || networkColors.default
  const lighten = isDark ? color : color + "dd"
  return [color, lighten]
}

// ── Weighted Substring Search (replaces Fuse.js) ─────────────────────────────

interface WeightedKey {
  key: string
  weight: number
}

function weightedSearch<T>(
  items: T[],
  query: string,
  keys: WeightedKey[],
): T[] {
  if (!query) return items
  const q = query.toLowerCase()
  const scored = items
    .map((item) => {
      let score = 0
      for (const { key, weight } of keys) {
        // Navigate nested keys like "card_details.card_name"
        const parts = key.split(".")
        let value: any = item
        for (const p of parts) {
          value = value?.[p]
        }
        const str = String(value ?? "").toLowerCase()
        if (str.includes(q)) {
          // Exact word-boundary match scores higher
          if (str.startsWith(q) || str.includes(" " + q)) {
            score += weight * 1.5
          } else {
            score += weight
          }
        }
      }
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.map(({ item }) => item)
}

// ── Fee Waiver Derivation (matches Expo feeWaiver.ts exactly) ─────────────────

interface FeeWaiverPresentation {
  hasWaiver: boolean
  target: number
  currentSpend: number
  remainingAmount: number
  percentComplete: number
  milestone: string
}

function deriveFeeWaiverProgress(card: any): FeeWaiverPresentation {
  const target = Number(card.effective_fee_waiver_threshold) || 0
  if (target <= 0 || isNaN(target)) {
    return {
      hasWaiver: false,
      target: 0,
      currentSpend: 0,
      remainingAmount: 0,
      percentComplete: 0,
      milestone: "No Waiver",
    }
  }
  const currentSpend = Number(card.annual_spend) || 0
  const remainingAmount = Math.max(0, target - currentSpend)
  const percentComplete = Math.min((currentSpend / target) * 100, 100)
  let milestone = "Good Start"
  if (percentComplete >= 100) milestone = "Waiver Achieved"
  else if (percentComplete >= 90) milestone = "Almost Unlocked"
  else if (percentComplete >= 75) milestone = "Near Waiver"
  else if (percentComplete >= 50) milestone = "Halfway There"
  else if (percentComplete >= 25) milestone = "Building Progress"
  return { hasWaiver: true, target, currentSpend, remainingAmount, percentComplete, milestone }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ── FeaturedWalletCard ───────────────────────────────────────────────────────

function FeaturedWalletCard({
  card,
  insight,
  onPress,
  isDark,
}: {
  card: any
  insight: any
  onPress: () => void
  isDark: boolean
}) {
  const cardName = card.nickname || card.card_details?.card_name || "Card"
  const bankName = card.card_details?.bank_name || "Bank"
  const network = card.network_override || card.card_details?.network || "VISA"
  const displayNetwork =
    network.toUpperCase() === "NA" || network.toUpperCase() === "N/A"
      ? ""
      : network.toUpperCase()
  const [gradientStart, gradientEnd] = getNetworkGradient(network, isDark)

  const topTag =
    insight?.badge_label ||
    (card.card_status === "ACTIVE" ? "ACTIVE CARD" : "INACTIVE")
  const topTagColor =
    insight?.badge_color ||
    (card.card_status === "ACTIVE" ? "#22C55E" : "#6B7280")

  // Actionable insight content
  let footerContent: React.ReactNode
  if (insight?.category === "FEE_WAIVER" && insight.monetary_value !== undefined) {
    const currentSpend = Number(card.current_spend) || 0
    const target = currentSpend + insight.monetary_value
    const percentComplete = Math.min((currentSpend / target) * 100, 100)
    const remaining = target - currentSpend
    footerContent = (
      <div>
        <p
          className="plasmo-text-caption plasmo-font-medium plasmo-leading-4"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 700 }}>
            {formatCurrencyIN(remaining)}
          </span>{" "}
          away from waiver
        </p>
        <div
          className="plasmo-h-[3px] plasmo-rounded-full plasmo-mt-1.5 plasmo-overflow-hidden"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            width: "80%",
          }}
        >
          <div
            className="plasmo-h-full plasmo-rounded-full"
            style={{
              width: `${percentComplete}%`,
              backgroundColor: topTagColor,
            }}
          />
        </div>
      </div>
    )
  } else {
    footerContent = (
      <p
        className="plasmo-text-caption plasmo-font-medium plasmo-leading-4"
        style={{ color: "rgba(255,255,255,0.7)" }}
      >
        {insight?.summary ||
          (card.card_status === "ACTIVE"
            ? "Active and ready to use"
            : "Currently inactive")}
      </p>
    )
  }

  return (
    <div
      className="plasmo-w-[200px] plasmo-h-[150px] plasmo-rounded-xl plasmo-relative"
    >
      {/* Ambient background glow */}
      <div
        className="plasmo-absolute plasmo--inset-2.5 plasmo-rounded-[23px] plasmo--z-[1]"
        style={{
          backgroundColor: topTagColor,
          opacity: 0.1,
        }}
      />
      <button
        onClick={onPress}
        className="plasmo-w-full plasmo-h-full plasmo-rounded-xl plasmo-overflow-hidden plasmo-border plasmo-border-border-highlight plasmo-cursor-pointer plasmo-text-left"
        style={{ background: "none", padding: 0 }}
      >
        <div
          className="plasmo-w-full plasmo-h-full plasmo-p-4 plasmo-flex plasmo-flex-col plasmo-justify-between"
          style={{
            background: `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`,
          }}
        >
          {/* Top edge highlight */}
          <div
            className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(255,255,255,0.4)",
            }}
          />
          {/* Header badge */}
          <div>
            <span
              className="plasmo-inline-block plasmo-px-2 plasmo-py-1 plasmo-rounded plasmo-text-micro plasmo-font-extrabold plasmo-tracking-widest"
              style={{ backgroundColor: `${topTagColor}20`, color: topTagColor }}
            >
              {topTag}
            </span>
          </div>
          {/* Bottom block */}
          <div>
            <div className="plasmo-mb-6">
              <p
                className="plasmo-text-micro plasmo-font-bold plasmo-tracking-widest plasmo-mb-1"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {bankName.toUpperCase()}
              </p>
              <p
                className="plasmo-text-title plasmo-font-extrabold"
                style={{ color: "rgba(255,255,255,0.95)" }}
              >
                {cardName}
              </p>
            </div>
            <div className="plasmo-flex plasmo-justify-between plasmo-items-end">
              <div className="plasmo-flex-1 plasmo-pr-3">
                {footerContent}
              </div>
              <div className="plasmo-text-right plasmo-shrink-0">
                {!!displayNetwork && (
                  <p
                    className="plasmo-text-caption plasmo-font-extrabold plasmo-tracking-widest"
                    style={{ color: "rgba(255,255,255,0.85)" }}
                  >
                    {displayNetwork}
                  </p>
                )}
                {!!card.last_4_digits && (
                  <p
                    className="plasmo-text-[10px] plasmo-tracking-[2px]"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {".... " + card.last_4_digits}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}

// ── FeaturedCardsSection ─────────────────────────────────────────────────────

function FeaturedCardsSection({
  cards,
  insights,
  onSelectCard,
}: {
  cards: any[]
  insights: any[]
  onSelectCard: (card: any) => void
}) {
  const featuredCards = useMemo(() => {
    if (!cards || cards.length === 0) return []
    // Cards with high/medium/urgent priority insights first
    const cardsWithInsights = cards.filter((c) =>
      insights.some(
        (i) =>
          i.related_card_id === c.id &&
          (i.priority === "HIGH" ||
            i.priority === "MEDIUM" ||
            i.priority === "URGENT"),
      ),
    )
    // Fill remaining slots with active cards sorted by spend
    if (cardsWithInsights.length < 3) {
      const activeCards = cards
        .filter(
          (c) =>
            c.card_status === "ACTIVE" &&
            !cardsWithInsights.some((ci) => ci.id === c.id),
        )
        .sort((a, b) => (b.annual_spend || 0) - (a.annual_spend || 0))
      cardsWithInsights.push(
        ...activeCards.slice(0, 3 - cardsWithInsights.length),
      )
    }
    return cardsWithInsights.slice(0, 3)
  }, [cards, insights])

  if (featuredCards.length === 0) return null

  return (
    <div className="plasmo-mb-6">
      <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-px-4 plasmo-mb-2">
        <Sparkles className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
        <span className="plasmo-text-micro plasmo-font-extrabold plasmo-tracking-widest plasmo-uppercase plasmo-text-text-secondary">
          FEATURED FOR YOU
        </span>
      </div>
      <div
        className="plasmo-flex plasmo-overflow-x-auto plasmo-px-4 plasmo-pb-4 plasmo-pt-3 plasmo-gap-[18px] plasmo-snap-x plasmo-snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        {featuredCards.map((card) => {
          const insight = insights.find((i) => i.related_card_id === card.id)
          return (
            <div key={card.id} className="plasmo-snap-start plasmo-shrink-0">
              <FeaturedWalletCard
                card={card}
                insight={insight}
                onPress={() => onSelectCard(card)}
                isDark={false}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── PortfolioLens ────────────────────────────────────────────────────────────

function PortfolioLens({
  personality,
  onTap,
}: {
  personality: any
  onTap: () => void
}) {
  if (!personality) return null

  const personaLabel = personality?.persona_label || "Balanced Optimizer"
  const behavioralSignal =
    personality?.behavioral_signal || "Optimizing across your card portfolio"

  return (
    <button
      onClick={onTap}
      className="plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-px-4 plasmo--mt-3 plasmo-mb-5 plasmo-cursor-pointer"
      style={{ background: "none", border: "none" }}
    >
      <Focus className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-text-muted plasmo-mr-2 plasmo-mt-0.5 plasmo-shrink-0" />
      <div>
        <p className="plasmo-text-body plasmo-font-medium plasmo-italic plasmo-text-text-secondary">
          Portfolio Persona: {personaLabel}
        </p>
        <p className="plasmo-text-micro plasmo-text-text-muted plasmo-mt-0.5">
          {behavioralSignal}
        </p>
      </div>
    </button>
  )
}

// ── WalletInventoryRow (matches Expo exactly) ────────────────────────────────

function WalletInventoryRow({
  card,
  onPress,
}: {
  card: any
  onPress: () => void
}) {
  const cardName = card.nickname || card.card_details?.card_name || "Card"
  const bankName = card.card_details?.bank_name || "Bank"
  const network = card.network_override || card.card_details?.network || "VISA"
  const displayNetwork =
    network.toUpperCase() === "NA" || network.toUpperCase() === "N/A"
      ? ""
      : network.toUpperCase()
  const isActive = card.card_status === "ACTIVE"

  const waiver = deriveFeeWaiverProgress(card)
  const hasWaiver = waiver.hasWaiver
  const waiverPercent = waiver.percentComplete

  // Heuristic tags
  let tag = "Rewards"
  const cNameLow = cardName.toLowerCase()
  if (cNameLow.includes("travel") || cNameLow.includes("miles")) tag = "Travel"
  else if (cNameLow.includes("cashback") || cNameLow.includes("ace"))
    tag = "Cashback"
  else if (cNameLow.includes("fuel") || cNameLow.includes("petro")) tag = "Fuel"

  const [gradStart, gradEnd] = getNetworkGradient(network, false)

  return (
    <button
      onClick={onPress}
      className="plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-py-2.5 plasmo-px-4 plasmo-border-b plasmo-border-border plasmo-cursor-pointer hover:plasmo-bg-background plasmo-transition-colors"
      style={{
        background: "none",
        opacity: isActive ? 1 : 0.5,
      }}
    >
      {/* Mini Card Tile (48x32) */}
      <div className="plasmo-relative plasmo-mr-4 plasmo-shrink-0">
        <div
          className="plasmo-w-10 plasmo-h-7 plasmo-rounded plasmo-overflow-hidden"
          style={{
            opacity: 0.9,
            background: isActive
              ? `linear-gradient(135deg, ${gradStart}, ${gradEnd})`
              : undefined,
            backgroundColor: isActive ? undefined : "#E7E8F0",
          }}
        />
        {!!displayNetwork && (
          <div
            className="plasmo-absolute plasmo-bottom-0.5 plasmo-right-1"
          >
            <span
              className="plasmo-text-[6px] plasmo-font-bold"
              style={{ color: isActive ? "#FFF" : "#6B7280" }}
            >
              {displayNetwork}
            </span>
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="plasmo-flex-1 plasmo-min-w-0 plasmo-mr-3">
        <p
          className="plasmo-text-body-sm plasmo-font-semibold plasmo-mb-1"
          style={{
            color: isActive ? "#14142B" : "#666A80",
          }}
        >
          {bankName} {cardName}
        </p>
        <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5">
          <span className="plasmo-text-micro plasmo-text-text-muted">
            {displayNetwork}
            {displayNetwork && card.last_4_digits ? ` .... ` : ""}
            {card.last_4_digits || ""}
          </span>
          <span className="plasmo-w-[3px] plasmo-h-[3px] plasmo-rounded-full plasmo-bg-border-highlight" />
          <span className="plasmo-text-micro plasmo-text-text-secondary">
            {tag}
          </span>
        </div>
      </div>

      {/* Waiver progress + status */}
      <div className="plasmo-flex plasmo-flex-col plasmo-items-end plasmo-mr-3 plasmo-shrink-0">
        {isActive && hasWaiver ? (
          <>
            <div className="plasmo-flex plasmo-items-baseline plasmo-gap-0.5 plasmo-mb-1">
              <span className="plasmo-text-caption plasmo-font-bold plasmo-text-success">
                {formatCompactIN(waiver.currentSpend)}
              </span>
              <span className="plasmo-text-micro plasmo-text-text-muted">
                {" / "}
                {formatCompactIN(waiver.target)}
              </span>
            </div>
            <span className="plasmo-text-micro plasmo-font-bold plasmo-text-success plasmo-mb-1">
              {Math.min(waiverPercent, 100).toFixed(0)}% complete
            </span>
            <div className="plasmo-w-20 plasmo-h-[3px] plasmo-bg-border-highlight plasmo-rounded-full plasmo-overflow-hidden">
              <div
                className="plasmo-h-full plasmo-rounded-full"
                style={{
                  width: `${Math.min(waiverPercent, 100)}%`,
                  backgroundColor:
                    waiverPercent >= 100 ? "#22C55E" : "#4F36FF",
                }}
              />
            </div>
          </>
        ) : isActive ? (
          <span className="plasmo-text-micro plasmo-text-text-muted">
            No waiver info
          </span>
        ) : null}
        <div
          className={`plasmo-flex plasmo-items-center plasmo-gap-1 plasmo-mt-1 ${
            !isActive ? "plasmo-px-1.5 plasmo-py-0.5 plasmo-rounded plasmo-bg-[rgba(150,150,150,0.1)]" : ""
          }`}
        >
          {isActive && (
            <span className="plasmo-w-1 plasmo-h-1 plasmo-rounded-full plasmo-bg-success" />
          )}
          <span
            className="plasmo-text-[10px] plasmo-font-medium"
            style={{ color: isActive ? "#22C55E" : "#6B7280" }}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted plasmo-shrink-0" />
    </button>
  )
}

// ── CardDetailSheet (matches Expo CardDetailSheet exactly) ───────────────────

function CardDetailSheet({
  card,
  onClose,
  onRemove,
  onToggleStatus,
  isDark,
}: {
  card: any
  onClose: () => void
  onRemove: () => void
  onToggleStatus: (newStatus: string) => void
  isDark: boolean
}) {
  const cardName = card.nickname || card.card_details?.card_name || "Card"
  const bankName = card.card_details?.bank_name || "Bank"
  const network = card.network_override || card.card_details?.network || "VISA"
  const displayNetwork =
    network.toUpperCase() === "NA" || network.toUpperCase() === "N/A"
      ? ""
      : network.toUpperCase()
  const isActive = card.card_status === "ACTIVE"
  const [gradientStart] = getNetworkGradient(network, isDark)

  // Fee Waiver logic
  const hasWaiver =
    card.effective_fee_waiver_threshold != null &&
    card.effective_fee_waiver_threshold > 0
  const waiverPercent = card.fee_waiver_progress_percent || 0
  const remainingSpend = card.remaining_spend_for_waiver || 0
  const waiverTarget = card.effective_fee_waiver_threshold || 0

  // Intelligence chips
  const cNameLow = cardName.toLowerCase()
  const intelligenceChips: {
    label: string
    icon: React.ReactNode
    color: string
  }[] = []
  if (hasWaiver && waiverPercent >= 75 && waiverPercent < 100) {
    intelligenceChips.push({
      label: "Near Fee Waiver",
      icon: <Activity className="plasmo-w-3 plasmo-h-3" />,
      color: "#F59E0B",
    })
  } else if (card.annual_spend > 50000) {
    intelligenceChips.push({
      label: "Frequently Used",
      icon: <Zap className="plasmo-w-3 plasmo-h-3" />,
      color: "#4F36FF",
    })
  }
  if (
    cNameLow.includes("travel") ||
    cNameLow.includes("miles") ||
    cNameLow.includes("club")
  ) {
    intelligenceChips.push({
      label: "Travel Optimized",
      icon: <Plane className="plasmo-w-3 plasmo-h-3" />,
      color: "#0EA5E9",
    })
  }
  if (cNameLow.includes("cashback") || cNameLow.includes("ace")) {
    intelligenceChips.push({
      label: "Cashback Rewards",
      icon: <ShoppingBag className="plasmo-w-3 plasmo-h-3" />,
      color: "#10B981",
    })
  }
  if (cNameLow.includes("fuel") || cNameLow.includes("petro")) {
    intelligenceChips.push({
      label: "Fuel Benefits",
      icon: <Fuel className="plasmo-w-3 plasmo-h-3" />,
      color: "#F59E0B",
    })
  }
  if (cNameLow.includes("dine") || cNameLow.includes("swiggy")) {
    intelligenceChips.push({
      label: "Dining Benefits",
      icon: <Utensils className="plasmo-w-3 plasmo-h-3" />,
      color: "#EC4899",
    })
  }
  const finalChips = intelligenceChips.slice(0, 4)

  const [confirmRemove, setConfirmRemove] = useState(false)

  const bentoBoxClass = `plasmo-rounded-[20px] plasmo-border plasmo-p-4 plasmo-w-full`
  const bentoBoxStyle: React.CSSProperties = {
    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FFFFFF",
    borderColor: "rgba(231, 232, 240, 0.70)",
  }

  return (
    <div
      className="plasmo-fixed plasmo-inset-0 plasmo-z-50 plasmo-flex plasmo-items-end plasmo-justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      {/* Backdrop tap to close */}
      <div className="plasmo-absolute plasmo-inset-0" onClick={onClose} />

      <div
        className="plasmo-relative plasmo-w-full plasmo-max-w-[420px] plasmo-h-[92%] plasmo-rounded-t-[32px] plasmo-overflow-hidden plasmo-flex plasmo-flex-col plasmo-z-10"
        style={{
          backgroundColor: isDark
            ? "rgba(20,20,43,0.85)"
            : "rgba(255, 255, 255, 0.80)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
          border: "1px solid rgba(231, 232, 240, 0.70)",
        }}
      >
        {/* Top highlight */}
        <div
          className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px plasmo-z-10"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.90)" }}
        />

        {/* Header */}
        <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-6 plasmo-pt-6 plasmo-pb-1 plasmo-z-10">
          <div className="plasmo-w-9" />
          <button
            onClick={onClose}
            className="plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <X
              className="plasmo-w-[18px] plasmo-h-[18px] plasmo-text-text-secondary"
              strokeWidth={2.5}
            />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-px-5 plasmo-pt-3 plasmo-pb-16">
          {/* Hero Card */}
          <div
            className="plasmo-w-full plasmo-aspect-[1.58] plasmo-rounded-[20px] plasmo-p-4 plasmo-mb-4 plasmo-overflow-hidden plasmo-relative plasmo-flex plasmo-flex-col plasmo-justify-between"
            style={{
              background: `linear-gradient(135deg, ${gradientStart}, ${gradientStart}dd)`,
              boxShadow: "0 12px 24px rgba(0,0,0,0.3)",
            }}
          >
            <div
              className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px"
              style={{ backgroundColor: "rgba(255,255,255,0.3)" }}
            />
            <div
              className="plasmo-absolute plasmo--top-1/2 plasmo--left-1/2 plasmo-w-[200%] plasmo-h-[200%]"
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                transform: "rotate(45deg)",
              }}
            />
            {/* Header row */}
            <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-relative">
              <p className="plasmo-text-micro plasmo-font-extrabold plasmo-tracking-widest plasmo-uppercase plasmo-flex-1" style={{ color: "rgba(255,255,255,0.8)" }}>
                {bankName}
              </p>
              <span
                className="plasmo-px-2.5 plasmo-py-1 plasmo-rounded-xl plasmo-text-[9px] plasmo-font-extrabold plasmo-tracking-[1px]"
                style={{
                  backgroundColor: isActive
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.3)",
                  color: "#FFF",
                }}
              >
                {isActive ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
            {/* Middle */}
            <div className="plasmo-relative">
              <Wifi
                className="plasmo-w-7 plasmo-h-7 plasmo-mb-4"
                style={{
                  color: "rgba(255,255,255,0.6)",
                  transform: "rotate(90deg)",
                }}
              />
              <p className="plasmo-text-[16px] plasmo-font-extrabold plasmo-tracking-[0.5px] plasmo-text-white">
                {cardName}
              </p>
              {card.last_4_digits && (
                <p
                  className="plasmo-text-[12px] plasmo-font-medium plasmo-tracking-[3px] plasmo-mt-1.5"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {".... .... .... " + card.last_4_digits}
                </p>
              )}
            </div>
            {/* Footer */}
            <div className="plasmo-flex plasmo-justify-between plasmo-items-end plasmo-relative">
              <div>
                <p
                  className="plasmo-text-[9px] plasmo-font-bold plasmo-tracking-[1px] plasmo-mb-0.5"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  ANNUAL FEE
                </p>
                <p className="plasmo-text-[12px] plasmo-font-extrabold plasmo-text-white">
                  {card.effective_annual_fee
                    ? formatCurrencyIN(card.effective_annual_fee)
                    : "Free"}
                </p>
              </div>
              {!!displayNetwork && (
                <p
                  className="plasmo-text-[12px] plasmo-font-extrabold plasmo-tracking-[2px]"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  {displayNetwork}
                </p>
              )}
            </div>
          </div>

          {/* Bento Grid */}
          <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-3">
            {/* Fee Waiver Progress (full width) */}
            {hasWaiver && (
              <div className={bentoBoxClass} style={bentoBoxStyle}>
                <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                  <span className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px] plasmo-text-text-muted">
                    FEE WAIVER PROGRESS
                  </span>
                  <Sparkles className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-primary" />
                </div>
                <div className="plasmo-flex plasmo-items-baseline plasmo-mb-3">
                  <span className="plasmo-text-[16px] plasmo-font-extrabold plasmo-text-success plasmo--tracking-[0.5px]">
                    {"₹" +
                      (card.annual_spend || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="plasmo-text-[12px] plasmo-font-medium plasmo-text-text-muted plasmo-ml-1">
                    {" / ₹" + waiverTarget.toLocaleString("en-IN")}
                  </span>
                </div>
                <div
                  className="plasmo-h-2 plasmo-rounded-full plasmo-overflow-hidden plasmo-mb-3"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    className="plasmo-h-full plasmo-rounded-full"
                    style={{
                      width: `${Math.min(waiverPercent, 100)}%`,
                      backgroundColor: "#22C55E",
                    }}
                  />
                </div>
                <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
                  <span className="plasmo-text-xs plasmo-font-medium plasmo-text-text-secondary">
                    {card.waiver_achieved
                      ? "Waiver achieved"
                      : `${"₹" + remainingSpend.toLocaleString("en-IN")} remaining`}
                  </span>
                  <span
                    className="plasmo-px-2 plasmo-py-0.5 plasmo-rounded-lg plasmo-text-[10px] plasmo-font-bold plasmo-text-text-primary"
                    style={{ backgroundColor: "rgba(20, 20, 43, 0.08)" }}
                  >
                    {Math.min(waiverPercent, 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Annual Fee + Fee Cycle (2 columns) */}
            <div className="plasmo-w-full plasmo-flex plasmo-gap-3">
              <div
                className={`${bentoBoxClass} plasmo-flex-1 plasmo-h-[110px] plasmo-flex plasmo-flex-col plasmo-justify-between`}
                style={bentoBoxStyle}
              >
                <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
                  <span className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px] plasmo-text-text-muted">
                    ANNUAL FEE
                  </span>
                  <Pencil className="plasmo-w-3 plasmo-h-3 plasmo-text-text-muted" />
                </div>
                <div>
                  <p className="plasmo-text-[15px] plasmo-font-extrabold plasmo--tracking-[0.5px] plasmo-mb-1 plasmo-text-text-primary">
                    {card.effective_annual_fee
                      ? formatCurrencyIN(card.effective_annual_fee)
                      : "Free"}
                  </p>
                  <p className="plasmo-text-xs plasmo-font-medium plasmo-text-text-secondary">
                    {card.fee_confidence === "USER_CALIBRATED"
                      ? "Custom fee"
                      : "Estimated"}
                  </p>
                </div>
              </div>

              <div
                className={`${bentoBoxClass} plasmo-flex-1 plasmo-h-[110px] plasmo-flex plasmo-flex-col plasmo-justify-between`}
                style={bentoBoxStyle}
              >
                <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
                  <span className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px] plasmo-text-text-muted">
                    FEE CYCLE
                  </span>
                  <Calendar className="plasmo-w-3 plasmo-h-3 plasmo-text-text-muted" />
                </div>
                <div>
                  <p className="plasmo-text-[15px] plasmo-font-extrabold plasmo--tracking-[0.5px] plasmo-mb-1 plasmo-text-text-primary">
                    {card.annual_fee_debit_date
                      ? card.annual_fee_debit_date.split("-").reverse().join("/")
                      : "Not set"}
                  </p>
                  <p className="plasmo-text-xs plasmo-font-medium plasmo-text-text-secondary">
                    {card.days_until_renewal !== null &&
                    card.days_until_renewal !== undefined
                      ? `${card.days_until_renewal} days left`
                      : "Add date"}
                  </p>
                </div>
              </div>
            </div>

            {/* Milestones */}
            {card.milestone_progress &&
              card.milestone_progress.length > 0 && (
                <div className={bentoBoxClass} style={bentoBoxStyle}>
                  <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                    <span className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px] plasmo-text-text-muted">
                      MILESTONES
                    </span>
                    <Trophy className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-primary" />
                  </div>
                  {card.milestone_progress.map(
                    (milestone: any, idx: number) => (
                      <div
                        key={idx}
                        className={idx > 0 ? "plasmo-mt-4" : "plasmo-mt-2"}
                      >
                        <div className="plasmo-flex plasmo-justify-between plasmo-mb-1.5">
                          <span className="plasmo-text-body plasmo-font-bold plasmo-text-text-primary">
                            {milestone.target_type === "TRANSACTION_COUNT"
                              ? "Monthly Txns"
                              : "Spend Goal"}
                          </span>
                          <span className="plasmo-text-body plasmo-font-bold plasmo-text-success">
                            {milestone.target_type === "TRANSACTION_COUNT"
                              ? `${milestone.current_value} / ${milestone.target_value}`
                              : `${"₹" + milestone.current_value.toLocaleString("en-IN")} / ${"₹" + milestone.target_value.toLocaleString("en-IN")}`}
                          </span>
                        </div>
                        <div
                          className="plasmo-h-[6px] plasmo-rounded-full plasmo-overflow-hidden plasmo-mb-2"
                          style={{
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(0,0,0,0.05)",
                          }}
                        >
                          <div
                            className="plasmo-h-full plasmo-rounded-full"
                            style={{
                              width: `${milestone.progress_percentage}%`,
                              backgroundColor: "#22C55E",
                            }}
                          />
                        </div>
                        <p className="plasmo-text-micro plasmo-text-text-secondary">
                          Reward:{" "}
                          {milestone.bonus_points
                            ? `${milestone.bonus_points} Pts`
                            : milestone.fee_waiver
                              ? "Fee Waiver"
                              : "Milestone"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}

            {/* Reward Rules */}
            {card.card_details?.reward_rules_json?.length > 0 && (
              <div className={bentoBoxClass} style={bentoBoxStyle}>
                <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                  <span className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px] plasmo-text-text-muted">
                    REWARD STRUCTURE
                  </span>
                  <Sparkles className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-primary" />
                </div>
                {card.card_details.reward_rules_json.map(
                  (r: any, i: number) => (
                    <div
                      key={i}
                      className="plasmo-flex plasmo-justify-between plasmo-text-caption plasmo-py-1"
                    >
                      <span className="plasmo-text-text-secondary plasmo-capitalize">
                        {r.category}
                      </span>
                      <span className="plasmo-font-bold plasmo-text-primary">
                        {r.reward_multiplier}x
                        {r.max_points_per_billing_cycle
                          ? ` (max ${r.max_points_per_billing_cycle})`
                          : ""}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* Intelligence */}
            <div
              className={bentoBoxClass}
              style={{
                ...bentoBoxStyle,
                backgroundColor: isDark
                  ? "rgba(139, 92, 246, 0.05)"
                  : "rgba(139, 92, 246, 0.02)",
                borderColor: "rgba(139, 92, 246, 0.2)",
              }}
            >
              <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
                <span
                  className="plasmo-text-[10px] plasmo-font-extrabold plasmo-tracking-[1.5px]"
                  style={{ color: "#8B5CF6" }}
                >
                  INTELLIGENCE
                </span>
                <Brain className="plasmo-w-3.5 plasmo-h-3.5" style={{ color: "#8B5CF6" }} />
              </div>
              <p className="plasmo-text-[12px] plasmo-leading-5 plasmo-font-medium plasmo-text-text-primary plasmo-mb-4">
                {hasWaiver && card.explanation_text
                  ? card.explanation_text
                  : `Best used for ${
                      cNameLow.includes("travel") || cNameLow.includes("miles")
                        ? "travel & milestone acceleration"
                        : "maximizing immediate cashback on daily spends"
                    }.`}
              </p>
              {finalChips.length > 0 && (
                <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2">
                  {finalChips.map((chip, idx) => (
                    <span
                      key={idx}
                      className="plasmo-inline-flex plasmo-items-center plasmo-gap-1.5 plasmo-px-2.5 plasmo-py-1.5 plasmo-rounded-xl plasmo-border plasmo-text-[10px] plasmo-font-bold plasmo-text-text-primary"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.05)"
                          : "#FFF",
                        borderColor: "rgba(231, 232, 240, 0.70)",
                      }}
                    >
                      <span style={{ color: chip.color }}>{chip.icon}</span>
                      {chip.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Settings / Quick Actions (iOS-style list) */}
            <div
              className="plasmo-w-full plasmo-rounded-[20px] plasmo-overflow-hidden plasmo-border plasmo-mt-2"
              style={{
                borderColor: "rgba(231, 232, 240, 0.70)",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "#FFFFFF",
              }}
            >
              {/* View Transactions */}
              <button
                className="plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-p-4 plasmo-cursor-pointer hover:plasmo-bg-background plasmo-transition-colors"
                style={{ background: "none", border: "none" }}
                onClick={onClose}
              >
                <div
                  className="plasmo-w-8 plasmo-h-8 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mr-4"
                  style={{ backgroundColor: "rgba(20, 20, 43, 0.08)" }}
                >
                  <FileText className="plasmo-w-4 plasmo-h-4 plasmo-text-text-primary" />
                </div>
                <span className="plasmo-flex-1 plasmo-text-[15px] plasmo-font-medium plasmo-text-text-primary">
                  View Transactions
                </span>
                <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
              </button>

              <div
                className="plasmo-h-px plasmo-ml-16"
                style={{ backgroundColor: "rgba(231, 232, 240, 0.70)" }}
              />

              {/* Edit Card Details (Coming Soon) */}
              <button
                className="plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-p-4 plasmo-cursor-pointer hover:plasmo-bg-background plasmo-transition-colors plasmo-opacity-60"
                style={{ background: "none", border: "none" }}
                disabled
              >
                <div
                  className="plasmo-w-8 plasmo-h-8 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mr-4"
                  style={{ backgroundColor: "rgba(20, 20, 43, 0.08)" }}
                >
                  <CreditCard className="plasmo-w-4 plasmo-h-4 plasmo-text-text-primary" />
                </div>
                <span className="plasmo-flex-1 plasmo-text-[15px] plasmo-font-medium plasmo-text-text-primary">
                  Edit Card Details
                </span>
                <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
              </button>

              <div
                className="plasmo-h-px plasmo-ml-16"
                style={{ backgroundColor: "rgba(231, 232, 240, 0.70)" }}
              />

              {/* Active Toggle */}
              <div className="plasmo-flex plasmo-items-center plasmo-p-4">
                <div
                  className="plasmo-w-8 plasmo-h-8 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mr-4"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(34, 197, 94, 0.12)"
                      : "rgba(20, 20, 43, 0.08)",
                  }}
                >
                  <Activity
                    className="plasmo-w-4 plasmo-h-4"
                    style={{ color: isActive ? "#22C55E" : "#14142B" }}
                  />
                </div>
                <span className="plasmo-flex-1 plasmo-text-[15px] plasmo-font-medium plasmo-text-text-primary">
                  Active in Wallet
                </span>
                <button
                  onClick={() =>
                    onToggleStatus(isActive ? "INACTIVE" : "ACTIVE")
                  }
                  className={`plasmo-w-11 plasmo-h-6 plasmo-rounded-full plasmo-relative plasmo-transition-colors plasmo-cursor-pointer`}
                  style={{
                    background: isActive ? "#22C55E" : "rgba(255,255,255,0.1)",
                    border: "none",
                  }}
                >
                  <div
                    className={`plasmo-absolute plasmo-top-0.5 plasmo-w-5 plasmo-h-5 plasmo-rounded-full plasmo-bg-white plasmo-shadow plasmo-transition-transform`}
                    style={{
                      transform: isActive
                        ? "translateX(22px)"
                        : "translateX(2px)",
                    }}
                  />
                </button>
              </div>

              <div
                className="plasmo-h-px plasmo-ml-16"
                style={{ backgroundColor: "rgba(231, 232, 240, 0.70)" }}
              />

              {/* Remove Card */}
              {!confirmRemove ? (
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-p-4 plasmo-cursor-pointer hover:plasmo-bg-background plasmo-transition-colors"
                  style={{ background: "none", border: "none" }}
                >
                  <div
                    className="plasmo-w-8 plasmo-h-8 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mr-4"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.1)" }}
                  >
                    <Trash2 className="plasmo-w-4 plasmo-h-4" style={{ color: "#EF4444" }} />
                  </div>
                  <span
                    className="plasmo-flex-1 plasmo-text-[15px] plasmo-font-medium"
                    style={{ color: "#EF4444" }}
                  >
                    Remove Card
                  </span>
                  <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
                </button>
              ) : (
                <div className="plasmo-p-4">
                  <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-primary plasmo-mb-3">
                    Remove this card from your wallet?
                  </p>
                  <div className="plasmo-flex plasmo-gap-3">
                    <button
                      onClick={() => setConfirmRemove(false)}
                      className="plasmo-flex-1 plasmo-py-2 plasmo-rounded-full plasmo-border plasmo-border-border plasmo-text-body plasmo-font-medium plasmo-text-text-secondary plasmo-cursor-pointer hover:plasmo-bg-background plasmo-transition-colors"
                      style={{ background: "none" }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setConfirmRemove(false)
                        onRemove()
                      }}
                      className="plasmo-flex-1 plasmo-py-2 plasmo-rounded-full plasmo-text-body plasmo-font-bold plasmo-text-white plasmo-cursor-pointer plasmo-transition-colors"
                      style={{
                        background: "#EF4444",
                        border: "none",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="plasmo-h-15" />
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WALLET TAB
// ═══════════════════════════════════════════════════════════════════════════════

export function WalletTab() {
  const [cards, setCards] = useState<any[]>([])
  const [catalog, setCatalog] = useState<any[]>([])
  const [personality, setPersonality] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Add Card Sheet state
  const [showSheet, setShowSheet] = useState(false)
  const [selectedCatalogCard, setSelectedCatalogCard] = useState<any>(null)
  const [nickname, setNickname] = useState("")
  const [last4Digits, setLast4Digits] = useState("")
  const [networkOverride, setNetworkOverride] = useState("")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Personality lens sheet
  const [showPersonalitySheet, setShowPersonalitySheet] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [cardData, pers, insightData] = await Promise.all([
        getCards(),
        getPersonalitySnapshot().catch(() => null),
        getSpendInsights().catch(() => []),
      ])
      setCards(
        Array.isArray(cardData) ? cardData : cardData?.cards || [],
      )
      setPersonality(pers)
      setInsights(Array.isArray(insightData) ? insightData : [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }
  useEffect(() => {
    loadData()
  }, [])

  const openSheet = async () => {
    setShowSheet(true)
    setSelectedCatalogCard(null)
    setNickname("")
    setLast4Digits("")
    setNetworkOverride("")
    setAddError(null)
    setIsCatalogLoading(true)
    try {
      const data = await getCardCatalog()
      setCatalog(Array.isArray(data) ? data : [])
    } catch {
      setCatalog([])
    } finally {
      setIsCatalogLoading(false)
    }
  }

  const closeSheet = () => {
    setShowSheet(false)
    setSelectedCatalogCard(null)
    setCatalogSearch("")
  }

  const handleAddCard = async () => {
    if (!selectedCatalogCard) return
    setIsAdding(true)
    setAddError(null)
    try {
      await addCard({
        card_catalog_id: selectedCatalogCard.id,
        nickname: nickname.trim() || undefined,
        last_4_digits: last4Digits.trim() || undefined,
        network_override: networkOverride || undefined,
      })
      closeSheet()
      loadData()
    } catch (err: any) {
      if (
        err.message?.includes("409") ||
        err.message?.toLowerCase().includes("already")
      ) {
        setAddError("This card is already in your wallet.")
      } else {
        setAddError(err.message || "Failed to add card")
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveCard = async (cardId: string) => {
    try {
      await removeCard(cardId)
      setSelectedCardId(null)
      loadData()
    } catch (err: any) {
      console.error("Failed to remove card:", err)
    }
  }

  const handleToggleStatus = (cardId: string, newStatus: string) => {
    // Optimistically update local state; the next loadData will sync
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, card_status: newStatus } : c,
      ),
    )
  }

  // Weighted search (replaces Fuse.js)
  const filteredCards = useMemo(() => {
    return weightedSearch(cards, searchQuery, [
      { key: "card_details.card_name", weight: 0.7 },
      { key: "nickname", weight: 0.7 },
      { key: "card_details.bank_name", weight: 0.3 },
      { key: "card_details.network", weight: 0.2 },
    ])
  }, [cards, searchQuery])

  const selectedCard = cards.find((c) => c.id === selectedCardId) || null

  const filteredCatalog = catalogSearch
    ? catalog.filter((c: any) =>
        (c.card_name + c.bank_name + c.network)
          .toLowerCase()
          .includes(catalogSearch.toLowerCase()),
      )
    : catalog

  const cardCount = cards.length

  const annualFees = cards.reduce(
    (s: number, c: any) => s + (Number(c.card_details?.annual_fee) || 0),
    0,
  )

  // Group cards by bank (matching SmartWalletInventory grouping)
  const groupedCards = useMemo(() => {
    const grouped: Record<
      string,
      { bank: string; cards: any[]; totalSpend: number; nearWaiverCount: number }
    > = {}
    filteredCards.forEach((card: any) => {
      const bank = normalizeBank(card.card_details?.bank_name || "Other")
      if (!grouped[bank])
        grouped[bank] = { bank, cards: [], totalSpend: 0, nearWaiverCount: 0 }
      grouped[bank].cards.push(card)
      grouped[bank].totalSpend += Number(card.annual_spend || 0)
      const wp = card.fee_waiver_progress_percent || 0
      if (wp >= 75 && wp < 100) grouped[bank].nearWaiverCount++
    })
    return Object.values(grouped)
  }, [filteredCards])

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-4">
      {/* Header */}
      <div className="plasmo-flex plasmo-justify-between plasmo-items-start plasmo-mb-6">
        <div>
          <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
            <h2 className="plasmo-text-display plasmo-font-extrabold plasmo-tracking-tightest plasmo-text-text-primary">
              Wallet
            </h2>
            {cardCount > 0 && (
              <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-bg-background plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">
                {cardCount} CARDS
              </span>
            )}
          </div>
          <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary plasmo-mt-1">
            Manage your active cards
          </p>
        </div>
        {cardCount > 0 && (
          <button
            onClick={openSheet}
            className="plasmo-w-11 plasmo-h-11 plasmo-rounded-full plasmo-border plasmo-border-primary plasmo-flex plasmo-items-center plasmo-justify-center plasmo-text-primary hover:plasmo-bg-primary-soft plasmo-transition-colors plasmo-cursor-pointer"
            style={{ background: "none" }}
          >
            <Plus className="plasmo-w-5 plasmo-h-5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* PortfolioLens (tappable) */}
      <PortfolioLens
        personality={personality}
        onTap={() => setShowPersonalitySheet(true)}
      />

      {/* Personality Sheet (simple modal) */}
      {showPersonalitySheet && (
        <div
          className="plasmo-fixed plasmo-inset-0 plasmo-z-50 plasmo-flex plasmo-items-end plasmo-justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="plasmo-absolute plasmo-inset-0"
            onClick={() => setShowPersonalitySheet(false)}
          />
          <div
            className="plasmo-relative plasmo-w-full plasmo-max-w-[420px] plasmo-rounded-t-[32px] plasmo-overflow-hidden plasmo-z-10 plasmo-p-6"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.80)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(231, 232, 240, 0.70)",
            }}
          >
            <div className="plasmo-flex plasmo-justify-center plasmo-mb-4">
              <div className="plasmo-w-11 plasmo-h-1.5 plasmo-rounded-full plasmo-bg-text-muted/30" />
            </div>
            <h3 className="plasmo-text-title plasmo-font-extrabold plasmo-text-text-primary plasmo-mb-2">
              Portfolio Persona
            </h3>
            <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary plasmo-mb-4">
              {personality?.persona_label || "Balanced Optimizer"}
            </p>
            <p className="plasmo-text-caption plasmo-text-text-muted plasmo-mb-6">
              {personality?.behavioral_signal ||
                "Optimizing across your card portfolio"}
            </p>
            <button
              onClick={() => setShowPersonalitySheet(false)}
              className="plasmo-w-full plasmo-bg-primary plasmo-text-white plasmo-py-2.5 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors"
              style={{ border: "none" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Portfolio Stats */}
      {!isLoading && cards.length > 0 && (
        <div className="plasmo-flex plasmo-gap-3 plasmo-mb-5">
          <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">
              Annual Fees
            </p>
            <p className="plasmo-text-headline plasmo-font-bold plasmo-text-text-primary">
              {"₹" + annualFees.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="plasmo-flex-1 plasmo-p-3 plasmo-rounded-card plasmo-bg-success-soft plasmo-border plasmo-border-success/20">
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">
              Total Spend
            </p>
            <p className="plasmo-text-headline plasmo-font-bold plasmo-text-success">
              {"₹" +
                cards
                  .reduce((s: number, c: any) => s + (Number(c.annual_spend) || 0), 0)
                  .toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="plasmo-space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border"
            >
              <SkeletonBox width="40%" height="10px" className="plasmo-mb-2" />
              <SkeletonBox
                width="60%"
                height="16px"
                className="plasmo-mb-3"
              />
              <div className="plasmo-flex plasmo-gap-2">
                <SkeletonBox width="60px" height="20px" />
                <SkeletonBox width="80px" height="20px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && cards.length === 0 && (
        <div className="plasmo-text-center plasmo-py-16">
          <div className="plasmo-w-16 plasmo-h-16 plasmo-rounded-full plasmo-bg-background plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-5">
            <CreditCard
              className="plasmo-w-8 plasmo-h-8 plasmo-text-text-muted"
              strokeWidth={1.5}
            />
          </div>
          <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary plasmo-mb-2">
            No cards yet
          </p>
          <p className="plasmo-text-body plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-mb-6">
            Add your credit cards to start tracking rewards and fee waivers
          </p>
          <button
            onClick={openSheet}
            className="plasmo-bg-primary plasmo-text-white plasmo-py-2.5 plasmo-px-8 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-cursor-pointer hover:plasmo-bg-primary-dark plasmo-transition-colors"
            style={{ border: "none" }}
          >
            Add Your First Card
          </button>
        </div>
      )}

      {/* Featured Cards Section */}
      {!isLoading && cards.length > 0 && (
        <FeaturedCardsSection
          cards={cards}
          insights={insights}
          onSelectCard={(card) => setSelectedCardId(card.id)}
        />
      )}

      {/* Search */}
      {cards.length > 1 && !isLoading && (
        <div className="plasmo-relative plasmo-mb-4 plasmo-px-4">
          <Search className="plasmo-absolute plasmo-left-7 plasmo-top-1/2 -plasmo-translate-y-1/2 plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards by name, bank or network..."
            className="plasmo-w-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-rounded-lg plasmo-pl-10 plasmo-pr-4 plasmo-py-2.5 plasmo-text-body plasmo-text-text-primary placeholder:plasmo-text-text-muted focus:plasmo-outline-none focus:plasmo-border-primary plasmo-transition-colors"
          />
        </div>
      )}

      {/* Section title */}
      {!isLoading && filteredCards.length > 0 && (
        <p className="plasmo-text-micro plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-secondary plasmo-mt-4 plasmo-mb--2 plasmo-ml-4">
          YOUR WALLET
        </p>
      )}

      {/* Card List — grouped by bank, matching Expo SmartWalletInventory + WalletInventoryRow */}
      {!isLoading &&
        groupedCards.map((group) => {
          const spendStr =
            group.totalSpend >= 100000
              ? `${"₹" + (group.totalSpend / 100000).toFixed(1)}L`
              : group.totalSpend > 0
                ? `${"₹" + (group.totalSpend / 1000).toFixed(0)}k`
                : "₹0"
          return (
            <div key={group.bank} className="plasmo-mb-6">
              {/* Bank Group Header — matching Expo SmartWalletInventory */}
              <div className="plasmo-flex plasmo-justify-between plasmo-items-baseline plasmo-px-4 plasmo-pt-4 plasmo-pb-1">
                <span className="plasmo-text-micro plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-secondary">
                  {group.bank.toUpperCase()} . {group.cards.length}{" "}
                  {group.cards.length === 1 ? "Card" : "Cards"}
                </span>
                <span className="plasmo-text-[10px] plasmo-font-medium plasmo-text-text-muted">
                  {spendStr} spend
                  {group.nearWaiverCount > 0
                    ? ` . ${group.nearWaiverCount} near waiver`
                    : ""}
                </span>
              </div>

              {/* Cards — using WalletInventoryRow (exact Expo match) */}
              <div>
                {group.cards.map((card: any) => (
                  <WalletInventoryRow
                    key={card.id}
                    card={card}
                    onPress={() => setSelectedCardId(card.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}

      {/* No search results */}
      {!isLoading && cards.length > 0 && filteredCards.length === 0 && (
        <div className="plasmo-text-center plasmo-py-12">
          <div className="plasmo-w-12 plasmo-h-12 plasmo-rounded-full plasmo-bg-background plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4">
            <Search
              className="plasmo-w-6 plasmo-h-6 plasmo-text-border-highlight"
              strokeWidth={1}
            />
          </div>
          <p className="plasmo-text-body-lg plasmo-font-bold plasmo-text-text-secondary plasmo-mb-1">
            No cards found.
          </p>
          <p className="plasmo-text-body plasmo-text-text-muted">
            Try searching by a different name or bank.
          </p>
        </div>
      )}

      {/* ── Card Detail Sheet (replaces inline expansion) ── */}
      {selectedCard && (
        <CardDetailSheet
          card={selectedCard}
          onClose={() => setSelectedCardId(null)}
          onRemove={() => handleRemoveCard(selectedCard.id)}
          onToggleStatus={(newStatus) =>
            handleToggleStatus(selectedCard.id, newStatus)
          }
          isDark={false}
        />
      )}

      {/* ── Add Card Modal ── matches Expo AddCardSheet flow ── */}
      {showSheet && (
        <div
          className="plasmo-fixed plasmo-inset-0 plasmo-z-50 plasmo-flex plasmo-items-end plasmo-justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
        >
          {/* Tap outside to close */}
          <div className="plasmo-absolute plasmo-inset-0" onClick={closeSheet} />

          <div
            className="plasmo-relative plasmo-w-full plasmo-max-w-[420px] plasmo-h-[90%] plasmo-rounded-t-sheet plasmo-overflow-hidden plasmo-bg-glass-surface plasmo-border plasmo-border-glass-border plasmo-flex plasmo-flex-col"
            style={{
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
            }}
          >
            {/* Top highlight & grabber */}
            <div className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px plasmo-bg-glass-highlight plasmo-z-10" />
            <div className="plasmo-flex plasmo-justify-center plasmo-pt-3 plasmo-pb-2 plasmo-z-10">
              <div className="plasmo-w-11 plasmo-h-1.5 plasmo-rounded-full plasmo-bg-text-muted/30" />
            </div>

            {/* Header */}
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between plasmo-px-4 plasmo-pb-3 plasmo-z-10">
              <h3 className="plasmo-text-title plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary">
                {selectedCatalogCard ? "Configure Card" : "Add New Card"}
              </h3>
              {selectedCatalogCard ? (
                <button
                  onClick={() => setSelectedCatalogCard(null)}
                  className="plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-bg-background plasmo-flex plasmo-items-center plasmo-justify-center hover:plasmo-bg-border plasmo-transition-colors"
                  style={{ border: "none" }}
                >
                  <ArrowLeft
                    className="plasmo-w-4.5 plasmo-h-4.5 plasmo-text-text-secondary"
                    strokeWidth={2.5}
                  />
                </button>
              ) : (
                <button
                  onClick={closeSheet}
                  className="plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-bg-background plasmo-flex plasmo-items-center plasmo-justify-center hover:plasmo-bg-border plasmo-transition-colors"
                  style={{ border: "none" }}
                >
                  <X
                    className="plasmo-w-4.5 plasmo-h-4.5 plasmo-text-text-secondary"
                    strokeWidth={2.5}
                  />
                </button>
              )}
            </div>

            {/* Config View */}
            {selectedCatalogCard ? (
              <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-px-4 plasmo-pb-6">
                {/* Card Preview */}
                <div className="plasmo-mb-6 plasmo-flex plasmo-justify-center">
                  <div
                    className="plasmo-w-[90%] plasmo-aspect-[1.45] plasmo-rounded-[20px] plasmo-p-4 plasmo-flex plasmo-flex-col plasmo-justify-between plasmo-overflow-hidden plasmo-relative plasmo-shadow-xl"
                    style={{
                      background: `linear-gradient(135deg, ${networkColors[(selectedCatalogCard.network || "default").toLowerCase()] || "#334155"}, ${networkColors[(selectedCatalogCard.network || "default").toLowerCase()] || "#64748B"})`,
                    }}
                  >
                    <div className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px plasmo-bg-white/25" />
                    <div>
                      <Wifi
                        className="plasmo-w-6 plasmo-h-6 plasmo-text-white/70"
                        style={{ transform: "rotate(90deg)" }}
                      />
                    </div>
                    <div>
                      <p className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-white/60 plasmo-mb-1">
                        {selectedCatalogCard.bank_name}
                      </p>
                      <p className="plasmo-text-title plasmo-font-extrabold plasmo-tracking-tight plasmo-text-white plasmo-mb-4">
                        {selectedCatalogCard.card_name}
                      </p>
                      <p className="plasmo-text-caption plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-white/80 plasmo-text-right">
                        {networkOverride || selectedCatalogCard.network}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nickname */}
                <div className="plasmo-mb-4">
                  <label className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-2 plasmo-block">
                    Card Nickname (Optional)
                  </label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g. Travel Rewards"
                    className="plasmo-w-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-rounded-lg plasmo-p-2.5 plasmo-text-body plasmo-text-text-primary placeholder:plasmo-text-text-muted focus:plasmo-outline-none focus:plasmo-border-primary plasmo-transition-colors"
                  />
                  <p className="plasmo-text-micro plasmo-text-text-muted plasmo-mt-1">
                    A friendly name to identify this card
                  </p>
                </div>

                {/* Last 4 digits */}
                <div className="plasmo-mb-4">
                  <label className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-2 plasmo-block">
                    Last 4 Digits (Optional)
                  </label>
                  <input
                    value={last4Digits}
                    onChange={(e) =>
                      setLast4Digits(e.target.value.slice(0, 4))
                    }
                    placeholder="e.g. 1234"
                    maxLength={4}
                    className="plasmo-w-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-rounded-lg plasmo-p-2.5 plasmo-text-body plasmo-text-text-primary placeholder:plasmo-text-text-muted focus:plasmo-outline-none focus:plasmo-border-primary plasmo-transition-colors"
                  />
                </div>

                {/* Network override */}
                <div className="plasmo-mb-6">
                  <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-muted plasmo-mb-3">
                    Card Network
                  </p>
                  <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-2.5">
                    {["VISA", "MASTERCARD", "RUPAY", "AMEX", "DINERS CLUB"].map(
                      (net) => {
                        const isActive =
                          networkOverride === net ||
                          (!networkOverride &&
                            selectedCatalogCard.network?.toUpperCase() === net)
                        return (
                          <button
                            key={net}
                            onClick={() =>
                              setNetworkOverride(isActive ? "" : net)
                            }
                            className={`plasmo-px-3.5 plasmo-py-2 plasmo-rounded-full plasmo-border plasmo-text-caption plasmo-font-medium plasmo-transition-colors plasmo-cursor-pointer ${
                              isActive
                                ? "plasmo-bg-surface plasmo-border-primary plasmo-text-primary plasmo-font-bold"
                                : "plasmo-bg-background plasmo-border-border plasmo-text-text-secondary hover:plasmo-border-primary/30"
                            }`}
                            style={{ background: isActive ? undefined : "none" }}
                          >
                            {net}
                          </button>
                        )
                      },
                    )}
                  </div>
                </div>

                {addError && (
                  <p className="plasmo-text-danger plasmo-text-body plasmo-mb-4 plasmo-p-3 plasmo-bg-danger-soft plasmo-rounded-lg">
                    {addError}
                  </p>
                )}

                <button
                  onClick={handleAddCard}
                  disabled={isAdding}
                  className="plasmo-w-full plasmo-bg-primary plasmo-text-white plasmo-py-3.5 plasmo-rounded-full plasmo-font-bold plasmo-text-body-lg plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-2 plasmo-cursor-pointer hover:plasmo-bg-primary-dark disabled:plasmo-opacity-50 plasmo-transition-colors"
                  style={{ border: "none" }}
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="plasmo-w-5 plasmo-h-5 plasmo-animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Wallet className="plasmo-w-5 plasmo-h-5" />
                      Add to Wallet
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* Catalog View — grouped by bank, matching Expo CardCatalogList */
              <div className="plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-overflow-hidden plasmo-px-4">
                <div className="plasmo-relative plasmo-mb-4">
                  <Search className="plasmo-absolute plasmo-left-3 plasmo-top-1/2 -plasmo-translate-y-1/2 plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
                  <input
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search bank, card, or network..."
                    className="plasmo-w-full plasmo-bg-surface-elevated plasmo-border plasmo-border-glass-border plasmo-rounded-xl plasmo-pl-10 plasmo-pr-4 plasmo-py-2.5 plasmo-text-body plasmo-text-text-primary placeholder:plasmo-text-text-muted focus:plasmo-outline-none focus:plasmo-border-primary plasmo-transition-colors"
                  />
                </div>
                {isCatalogLoading ? (
                  <div className="plasmo-flex-1 plasmo-flex plasmo-items-center plasmo-justify-center">
                    <Loader2 className="plasmo-w-8 plasmo-h-8 plasmo-text-primary plasmo-animate-spin" />
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-py-16">
                    <Search
                      className="plasmo-w-12 plasmo-h-12 plasmo-text-border-highlight plasmo-mb-4"
                      strokeWidth={1}
                    />
                    <p className="plasmo-text-body-lg plasmo-font-bold plasmo-text-text-secondary plasmo-mb-2">
                      No cards found.
                    </p>
                    <p className="plasmo-text-body plasmo-text-text-muted">
                      Try searching by a different bank or network.
                    </p>
                  </div>
                ) : (
                  <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-pb-10">
                    {(() => {
                      const sorted = [...filteredCatalog].sort(
                        (a: any, b: any) =>
                          a.card_name.localeCompare(b.card_name),
                      )
                      const grouped: Record<string, any[]> = {}
                      for (const c of sorted) {
                        const bank = normalizeBank(c.bank_name)
                        if (!grouped[bank]) grouped[bank] = []
                        grouped[bank].push(c)
                      }
                      return Object.keys(grouped)
                        .sort()
                        .map((bank, gi) => (
                          <div key={bank} className="plasmo-mb-7">
                            <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-2.5 plasmo-ml-2">
                              <Building2 className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-primary" />
                              <span className="plasmo-text-micro plasmo-font-extrabold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-secondary">
                                {bank}
                              </span>
                            </div>
                            <div
                              className="plasmo-rounded-xl plasmo-border plasmo-border-glass-border plasmo-overflow-hidden"
                              style={{
                                backgroundColor: "rgba(0,0,0,0.02)",
                              }}
                            >
                              {grouped[bank].map((c: any, i: number) => (
                                <button
                                  key={c.id}
                                  onClick={() =>
                                    setSelectedCatalogCard(c)
                                  }
                                  className={`plasmo-w-full plasmo-text-left plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-py-2.5 plasmo-px-3 plasmo-transition-colors hover:plasmo-bg-surface ${
                                    i < grouped[bank].length - 1
                                      ? "plasmo-border-b plasmo-border-border"
                                      : ""
                                  } plasmo-cursor-pointer`}
                                  style={{ background: "none" }}
                                >
                                  <div
                                    className="plasmo-w-9 plasmo-h-6 plasmo-rounded-md plasmo-flex plasmo-items-center plasmo-justify-center plasmo-shrink-0 plasmo-relative plasmo-overflow-hidden plasmo-border plasmo-border-white/10"
                                    style={{
                                      background: `linear-gradient(135deg, ${networkColors[(c.network || "default").toLowerCase()] || networkColors.default}, ${networkColors[(c.network || "default").toLowerCase()] || "#64748B"})`,
                                    }}
                                  >
                                    <div className="plasmo-absolute plasmo-top-0 plasmo-left-0 plasmo-right-0 plasmo-h-px plasmo-bg-white/20" />
                                    <CreditCard className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-white/60" />
                                  </div>
                                  <div className="plasmo-flex-1 plasmo-min-w-0">
                                    <p className="plasmo-text-body plasmo-font-extrabold plasmo-tracking-tight plasmo-text-text-primary">
                                      {c.card_name}
                                    </p>
                                    <p className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-muted">
                                      {c.network}
                                    </p>
                                  </div>
                                  <div className="plasmo-w-7 plasmo-h-7 plasmo-rounded-full plasmo-bg-surface plasmo-flex plasmo-items-center plasmo-justify-center">
                                    <ChevronRight
                                      className="plasmo-w-3.5 plasmo-h-3.5 plasmo-text-text-muted"
                                      strokeWidth={2}
                                    />
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
