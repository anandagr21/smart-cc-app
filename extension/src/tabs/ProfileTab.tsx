import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { getCards } from "../api/client"
import { logout } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { User, CreditCard, ChevronRight, Bell, Settings, Shield, Monitor, LogOut } from "lucide-react"

const storage = new Storage()

export function ProfileTab({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<any>(null)
  const [cardCount, setCardCount] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([storage.get("user"), getCards().catch(() => [])]).then(([userData, cards]) => {
      setUser(userData)
      setCardCount(Array.isArray(cards) ? cards.length : 0)
      setIsLoading(false)
    })
  }, [])

  const getInitials = () => {
    const name = user?.full_name || user?.name || ""
    if (name && name !== "User") {
      const parts = name.trim().split(" ")
      if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      return name.substring(0, 2).toUpperCase()
    }
    return user?.email ? user.email.substring(0, 2).toUpperCase() : "ME"
  }

  const handleLogout = async () => { await logout(); onLogout() }

  const SettingsRow = ({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick?: () => void; danger?: boolean }) => (
    <button onClick={onClick || (() => {})}
      className={`plasmo-w-full plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-p-4 plasmo-transition-colors ${danger ? "plasmo-text-danger hover:plasmo-bg-danger-soft" : "plasmo-text-text-primary hover:plasmo-bg-background"}`}>
      <div className={`plasmo-w-9 plasmo-h-9 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center ${danger ? "plasmo-bg-danger-soft" : "plasmo-bg-background"}`}>
        <Icon className={`plasmo-w-4 plasmo-h-4 ${danger ? "plasmo-text-danger" : "plasmo-text-text-secondary"}`} />
      </div>
      <span className={`plasmo-flex-1 plasmo-text-left plasmo-text-body plasmo-font-medium ${danger ? "plasmo-text-danger" : ""}`}>{label}</span>
      {!danger && <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />}
    </button>
  )

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-6">
      {/* Profile Header */}
      <div className="plasmo-text-center plasmo-mb-8 plasmo-mt-4">
        <div className="plasmo-w-20 plasmo-h-20 plasmo-rounded-full plasmo-bg-gradient-to-br plasmo-from-primary plasmo-to-accent plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-4 plasmo-shadow-lg">
          <span className="plasmo-text-2xl plasmo-font-bold plasmo-text-white">{getInitials()}</span>
        </div>
        <h2 className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary plasmo-mb-1">{user?.full_name || user?.name || user?.email || "Smart CC User"}</h2>
        {user?.email && <p className="plasmo-text-body plasmo-text-text-secondary">{user.email}</p>}

        <div className="plasmo-flex plasmo-justify-center plasmo-gap-8 plasmo-mt-6">
          <div className="plasmo-text-center">
            {isLoading ? <SkeletonBox width="28px" height="28px" className="plasmo-mx-auto plasmo-mb-1" /> : <p className="plasmo-text-headline plasmo-font-bold plasmo-text-text-primary">{cardCount}</p>}
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-muted">Cards</p>
          </div>
          <div className="plasmo-text-center">
            {isLoading ? <SkeletonBox width="28px" height="28px" className="plasmo-mx-auto plasmo-mb-1" /> : <p className="plasmo-text-headline plasmo-font-bold plasmo-text-text-primary">{user?.role === "ADMIN" ? "Admin" : "User"}</p>}
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-muted">Role</p>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="plasmo-space-y-6">
        <div>
          <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-2 plasmo-ml-1">Account</p>
          <div className="plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-overflow-hidden plasmo-divide-y plasmo-divide-border">
            <SettingsRow icon={Bell} label="Notifications" />
            <SettingsRow icon={Settings} label="Preferences" />
            <SettingsRow icon={Shield} label="Security" />
          </div>
        </div>

        <div>
          <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-2 plasmo-ml-1">Appearance</p>
          <div className="plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-p-4">
            <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
              <Monitor className="plasmo-w-4 plasmo-h-4 plasmo-text-text-secondary" />
              <span className="plasmo-text-body plasmo-font-medium plasmo-text-text-primary">System Theme</span>
              <span className="plasmo-text-caption plasmo-text-text-muted plasmo-ml-auto">Follows your browser settings</span>
            </div>
          </div>
        </div>

        <div>
          <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted plasmo-mb-2 plasmo-ml-1">Session</p>
          <div className="plasmo-bg-surface plasmo-border plasmo-border-border plasmo-rounded-card plasmo-overflow-hidden">
            <SettingsRow icon={LogOut} label="Sign Out" onClick={handleLogout} danger />
          </div>
        </div>

        <p className="plasmo-text-center plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-widest plasmo-text-text-muted">Smart CC • v0.0.1</p>
      </div>
    </div>
  )
}
