import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  icon: LucideIcon
  iconColor?: string
  label: string
  value: string
  accent?: boolean
  onClick?: () => void
}

export function StatCard({ icon: Icon, iconColor = "plasmo-text-[#4F36FF]", label, value, accent = false, onClick }: StatCardProps) {
  const Wrapper = onClick ? "button" : "div"
  return (
    <Wrapper
      onClick={onClick}
      className={`plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-p-4 plasmo-rounded-xl plasmo-border plasmo-transition-all plasmo-duration-200 ${
        accent
          ? "plasmo-bg-[#EDEAFF] plasmo-border-[#4F36FF]/20"
          : "plasmo-bg-white plasmo-border-[#E7E8F0] plasmo-shadow-sm"
      } ${onClick ? "hover:plasmo-bg-gray-50 plasmo-cursor-pointer" : ""}`}
    >
      <div className="plasmo-flex plasmo-items-center plasmo-gap-1.5 plasmo-mb-2">
        <Icon className={`plasmo-w-3.5 plasmo-h-3.5 ${iconColor}`} />
        <span className="plasmo-text-[10px] plasmo-font-bold plasmo-text-[#666A80] plasmo-uppercase plasmo-tracking-widest">
          {label}
        </span>
      </div>
      <span className={`plasmo-text-xl plasmo-font-bold ${accent ? "plasmo-text-[#4F36FF]" : "plasmo-text-[#14142B]"}`}>
        {value}
      </span>
    </Wrapper>
  )
}
