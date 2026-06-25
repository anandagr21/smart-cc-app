import { useEffect, useState } from "react"
import { Storage } from "@plasmohq/storage"
import { CreditCard, Loader2 } from "lucide-react"

import { LoginScreen } from "./components/LoginScreen"
import { TabBar } from "./components/TabBar"
import type { Tab } from "./components/TabBar"
import { HomeTab } from "./tabs/HomeTab"
import { WalletTab } from "./tabs/WalletTab"
import { ActivityTab } from "./tabs/ActivityTab"
import { ProfileTab } from "./tabs/ProfileTab"
import "~style.css"

const storage = new Storage()

function IndexPopup() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>("home")

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("[Smart CC Popup] Storage timeout — showing login")
      setIsAuthenticated(false)
    }, 2000)

    storage
      .get("access_token")
      .then((token) => {
        clearTimeout(timeout)
        console.log("[Smart CC Popup] Token check:", !!token)
        setIsAuthenticated(!!token)
      })
      .catch((err) => {
        clearTimeout(timeout)
        console.error("[Smart CC Popup] Storage error:", err)
        setIsAuthenticated(false)
      })

    return () => clearTimeout(timeout)
  }, [])

  const handleLogout = async () => {
    await storage.remove("access_token")
    await storage.remove("user")
    setIsAuthenticated(false)
    setActiveTab("home")
  }

  // ── Loading spinner ──────────────────────────────────────────────────────
  if (isAuthenticated === null) {
    return (
      <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-w-[400px] plasmo-h-[600px] plasmo-bg-[#F8F8FC] plasmo-text-[#14142B] plasmo-font-sans">
        <Loader2 className="plasmo-w-8 plasmo-h-8 plasmo-text-[#4F36FF] plasmo-animate-spin plasmo-mb-3" />
        <p className="plasmo-text-sm plasmo-text-[#666A80]">Loading Smart CC...</p>
      </div>
    )
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />
  }

  // ── Main app ─────────────────────────────────────────────────────────────
  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-w-[400px] plasmo-h-[600px] plasmo-bg-[#F8F8FC] plasmo-text-[#14142B] plasmo-font-sans">
      <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-p-4 plasmo-bg-white plasmo-border-b plasmo-border-[#E7E8F0]">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <div className="plasmo-bg-[#4F36FF]/10 plasmo-p-1.5 plasmo-rounded-lg">
            <CreditCard className="plasmo-w-5 plasmo-h-5 plasmo-text-[#4F36FF]" />
          </div>
          <h1 className="plasmo-text-lg plasmo-font-bold plasmo-tracking-tight plasmo-text-[#14142B]">Smart CC</h1>
        </div>
      </div>

      <div className="plasmo-flex-1 plasmo-overflow-hidden plasmo-flex plasmo-flex-col">
        {activeTab === "home" && <HomeTab onTabChange={(tab) => setActiveTab(tab as Tab)} />}
        {activeTab === "wallet" && <WalletTab />}
        {activeTab === "activity" && <ActivityTab />}
        {activeTab === "profile" && <ProfileTab onLogout={handleLogout} />}
      </div>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}

export default IndexPopup
