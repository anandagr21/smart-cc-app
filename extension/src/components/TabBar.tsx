import { Sparkles, CreditCard, History, User } from "lucide-react"

export type Tab = "home" | "wallet" | "activity" | "profile"

export function TabBar({ activeTab, onTabChange }: { activeTab: Tab; onTabChange: (tab: Tab) => void }) {
  const tabs: { key: Tab; icon: any; label: string }[] = [
    { key: "home", icon: Sparkles, label: "Home" },
    { key: "wallet", icon: CreditCard, label: "Wallet" },
    { key: "activity", icon: History, label: "Activity" },
    { key: "profile", icon: User, label: "Profile" },
  ]

  return (
    <nav className="plasmo-flex plasmo-border-t plasmo-border-border plasmo-bg-surface plasmo-p-2 plasmo-pb-3" role="tablist" aria-label="Main navigation">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button key={key} role="tab" aria-selected={activeTab === key} aria-label={label} onClick={() => onTabChange(key)}
          className={`plasmo-flex-1 plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-1 plasmo-py-1.5 plasmo-px-1 plasmo-rounded-lg plasmo-transition-colors plasmo-duration-200 plasmo-cursor-pointer focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-primary/50 focus:plasmo-ring-offset-1 focus:plasmo-ring-offset-surface ${
            activeTab === key ? "plasmo-text-primary" : "plasmo-text-text-muted hover:plasmo-text-text-secondary"}`}>
          <Icon className="plasmo-w-5 plasmo-h-5" aria-hidden="true" strokeWidth={activeTab === key ? 2.5 : 2} />
          <span className="plasmo-text-caption plasmo-font-bold">{label}</span>
        </button>
      ))}
    </nav>
  )
}
