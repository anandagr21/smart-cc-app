import { useState } from "react"
import { Storage } from "@plasmohq/storage"
import { loginWithGoogle } from "../api/client"
import { Sparkles, Key, AlertCircle } from "lucide-react"

const storage = new Storage()

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState("")

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)
    console.log("[Smart CC] Starting Google login...")

    try {
      if (!chrome?.identity?.getAuthToken) {
        setError("chrome.identity API not available. Use the manual token form below.")
        setIsLoading(false)
        return
      }

      chrome.identity.getAuthToken({ interactive: true }, async (token) => {
        if (chrome.runtime.lastError) {
          console.error("[Smart CC] getAuthToken error:", chrome.runtime.lastError)
          setError(`Google: ${chrome.runtime.lastError.message}. Use the manual token form below.`)
          setIsLoading(false)
          return
        }
        if (!token) {
          setError("No token received. Use the manual token form below.")
          setIsLoading(false)
          return
        }

        console.log("[Smart CC] Got Google token, sending to backend...")
        try {
          await loginWithGoogle(token)
          console.log("[Smart CC] Backend login succeeded")
          onLoginSuccess()
        } catch (err: any) {
          console.error("[Smart CC] Backend login failed:", err.message)
          setError(`Backend: ${err.message}. Use the manual token form below.`)
        } finally {
          setIsLoading(false)
        }
      })
    } catch (err: any) {
      console.error("[Smart CC] Login error:", err)
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handleDevLogin = async () => {
    if (!manualToken.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      await storage.set("access_token", manualToken.trim())
      await storage.set("user", {
        email: "dev@localhost",
        full_name: "Dev User",
      })
      console.log("[Smart CC] Manual login with token")
      onLoginSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="plasmo-flex plasmo-flex-col plasmo-items-center plasmo-justify-center plasmo-h-[500px] plasmo-p-6 plasmo-bg-[#F8F8FC] plasmo-text-center plasmo-overflow-y-auto plasmo-font-sans">
      <div className="plasmo-w-16 plasmo-h-16 plasmo-bg-[#4F36FF]/10 plasmo-rounded-full plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mb-6">
        <Sparkles className="plasmo-w-8 plasmo-h-8 plasmo-text-[#4F36FF]" />
      </div>
      <h1 className="plasmo-text-2xl plasmo-font-bold plasmo-text-[#14142B] plasmo-mb-2">
        Smart CC
      </h1>
      <p className="plasmo-text-[#666A80] plasmo-text-sm plasmo-mb-6">
        Log in to sync your wallet and get personalized recommendations.
      </p>

      {error && (
        <div className="plasmo-bg-red-500/10 plasmo-border plasmo-border-red-500/30 plasmo-rounded-lg plasmo-p-3 plasmo-mb-4 plasmo-w-full plasmo-text-left">
          <div className="plasmo-flex plasmo-items-start plasmo-gap-2">
            <AlertCircle className="plasmo-w-4 plasmo-h-4 plasmo-text-red-600 plasmo-shrink-0 plasmo-mt-0.5" />
            <p className="plasmo-text-red-600 plasmo-text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Manual Token Login — shown by default for dev */}
      <div className="plasmo-w-full plasmo-mb-4 plasmo-p-4 plasmo-bg-white plasmo-shadow-sm plasmo-border plasmo-border-[#E7E8F0] plasmo-rounded-xl">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-3">
          <Key className="plasmo-w-4 plasmo-h-4 plasmo-text-[#4F36FF]" />
          <p className="plasmo-text-sm plasmo-font-semibold plasmo-text-[#14142B]">
            Paste your JWT token
          </p>
        </div>
        <input
          type="password"
          value={manualToken}
          onChange={(e) => setManualToken(e.target.value)}
          placeholder="eyJhbGciOi..."
          className="plasmo-w-full plasmo-bg-[#F8F8FC] plasmo-border plasmo-border-[#E7E8F0] plasmo-rounded-lg plasmo-p-2.5 plasmo-text-xs plasmo-text-[#14142B] placeholder:plasmo-text-[#666A80] focus:plasmo-outline-none focus:plasmo-border-[#4F36FF] plasmo-mb-3"
        />
        <button
          onClick={handleDevLogin}
          disabled={isLoading || !manualToken.trim()}
          className="plasmo-w-full plasmo-bg-[#FF8A3D] hover:plasmo-bg-[#FF8A3D]/90 disabled:plasmo-opacity-50 plasmo-text-white plasmo-py-3 plasmo-rounded-lg plasmo-font-semibold plasmo-text-sm plasmo-cursor-pointer plasmo-transition-colors plasmo-duration-200 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#FF8A3D]/50 focus:plasmo-ring-offset-1 focus:plasmo-ring-offset-white"
        >
          {isLoading ? "Logging in..." : "Login"}
        </button>
        <p className="plasmo-text-[10px] plasmo-text-[#666A80] plasmo-mt-3 plasmo-text-left">
          Login via your Expo app, copy the JWT token, and paste it here.
        </p>
      </div>

      {/* Divider */}
      <div className="plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-w-full plasmo-mb-4">
        <div className="plasmo-flex-1 plasmo-h-px plasmo-bg-[#E7E8F0]" />
        <span className="plasmo-text-[10px] plasmo-text-[#666A80] plasmo-uppercase plasmo-font-semibold">or</span>
        <div className="plasmo-flex-1 plasmo-h-px plasmo-bg-[#E7E8F0]" />
      </div>

      {/* Google Sign In */}
      <button
        onClick={handleGoogleLogin}
        disabled={isLoading}
        className="plasmo-w-full plasmo-bg-white plasmo-border plasmo-border-[#E7E8F0] plasmo-text-[#14142B] plasmo-py-3 plasmo-rounded-xl plasmo-font-semibold plasmo-text-sm plasmo-flex plasmo-items-center plasmo-justify-center plasmo-gap-3 hover:plasmo-bg-gray-50 plasmo-shadow-sm plasmo-cursor-pointer plasmo-transition-colors plasmo-duration-200 focus:plasmo-outline-none focus:plasmo-ring-2 focus:plasmo-ring-[#E7E8F0] focus:plasmo-ring-offset-1 focus:plasmo-ring-offset-white disabled:plasmo-opacity-50"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="plasmo-w-5 plasmo-h-5"
        />
        Sign in with Google
      </button>
    </div>
  )
}
