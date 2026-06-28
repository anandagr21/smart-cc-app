import { Lightbulb, ChevronRight } from "lucide-react"

interface InsightCardProps {
  badgeLabel: string
  badgeColor: string
  title: string
  summary: string
  onClick?: () => void
}

export function InsightCard({ badgeLabel, badgeColor, title, summary, onClick }: InsightCardProps) {
  const Wrapper = onClick ? "button" : "div"

  return (
    <Wrapper
      onClick={onClick}
      className={`plasmo-block plasmo-w-full plasmo-text-left plasmo-p-4 plasmo-rounded-xl plasmo-border plasmo-border-[#E7E8F0] plasmo-bg-white plasmo-shadow-sm plasmo-transition-all plasmo-duration-200 ${
        onClick ? "hover:plasmo-bg-gray-50 plasmo-cursor-pointer" : ""
      }`}
      style={{ borderLeftWidth: "4px", borderLeftColor: badgeColor }}
    >
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center plasmo-mb-3">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <Lightbulb className="plasmo-w-4 plasmo-h-4" style={{ color: badgeColor }} />
          <span
            className="plasmo-text-[10px] plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-px-2 plasmo-py-0.5 plasmo-rounded"
            style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}
          >
            {badgeLabel}
          </span>
        </div>
        {onClick && <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-[#666A80]" />}
      </div>
      <p className="plasmo-text-sm plasmo-font-semibold plasmo-text-[#14142B] plasmo-mb-1">{title}</p>
      <p className="plasmo-text-xs plasmo-text-[#666A80] plasmo-leading-relaxed">{summary}</p>
    </Wrapper>
  )
}
