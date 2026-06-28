type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral"

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: "plasmo-bg-primary/20 plasmo-text-primary",
  success: "plasmo-bg-green-500/20 plasmo-text-green-400",
  warning: "plasmo-bg-amber-500/20 plasmo-text-amber-400",
  danger: "plasmo-bg-red-500/20 plasmo-text-red-400",
  neutral: "plasmo-bg-slate-700 plasmo-text-slate-300",
}

export function Badge({ label, variant = "primary" }: BadgeProps) {
  return (
    <span className={`plasmo-inline-flex plasmo-items-center plasmo-px-2 plasmo-py-0.5 plasmo-text-[10px] plasmo-font-bold plasmo-rounded-md plasmo-uppercase plasmo-tracking-wider ${variantClasses[variant]}`}>
      {label}
    </span>
  )
}
