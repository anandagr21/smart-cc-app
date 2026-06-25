import { fetchRecommendations } from "./api/client"
import { Storage } from "@plasmohq/storage"

const storage = new Storage()
let latestRecommendation: any = null

// ── Message Handlers ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FETCH_RECOMMENDATION") {
    handleFetchRecommendation(message.payload, sendResponse)
    return true // async
  }

  if (message.type === "GET_LATEST_RECOMMENDATION") {
    sendResponse(latestRecommendation)
    return true
  }

  return false
})

async function handleFetchRecommendation(
  payload: {
    merchant_name: string
    amount: number
    payment_mode?: string
    intent?: string
  },
  sendResponse: (response: any) => void
) {
  const intent = (payload.intent as "MAX_REWARDS" | "PRESERVE_FEE_WAIVER" | "BALANCED" | "SIMPLIFY") || "BALANCED"
  console.log("[Smart CC] Fetch recommendation:", payload)

  const token = await storage.get("access_token")
  if (!token) {
    console.log("[Smart CC] User not authenticated, skipping.")
    latestRecommendation = null
    sendResponse({ status: "unauthenticated" })
    return
  }

  try {
    const reqPayload = {
      merchant_name: payload.merchant_name,
      amount: payload.amount,
      payment_mode: payload.payment_mode || "ONLINE",
      intent: intent,
    }
    const res = await fetchRecommendations(reqPayload)
    console.log("[Smart CC] Recommendation received:", res)
    latestRecommendation = res.data

    // Show notification for the best card
    const bestCard = res.data?.best_balanced_card
    if (bestCard) {
      ;(chrome.notifications.create as any)({
        type: "basic",
        iconUrl: chrome.runtime.getManifest().icons?.["128"] || "",
        title: `Use ${bestCard.card_name}`,
        message: `Earn ${bestCard.reward_type} worth ₹${Math.round(bestCard.immediate_reward_value)} on this ₹${payload.amount} purchase.`,
        priority: 2,
      }).catch(() => {})
    }

    sendResponse({ status: "ok", data: res.data })
  } catch (err: any) {
    console.error("[Smart CC] Recommendation fetch failed:", err.message)
    latestRecommendation = null
    sendResponse({ status: "error", message: err.message })
  }
}

// ── Extension Install / Update ───────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("[Smart CC] Extension installed. Welcome!")
    // Open onboarding or set defaults
  } else if (details.reason === "update") {
    console.log("[Smart CC] Extension updated to", chrome.runtime.getManifest().version)
  }
})

// ── Keep service worker alive with periodic health check ────────────────────

setInterval(() => {
  // Lightweight keep-alive — prevents the service worker from going idle during active browsing
  console.debug("[Smart CC] Service worker heartbeat")
}, 4.5 * 60 * 1000) // Every 4.5 minutes (under 5-min idle threshold)

export {}
