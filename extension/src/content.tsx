import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { Sparkles, ChevronRight, AlertTriangle, TrendingUp, Loader2 } from "lucide-react"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

// Inject spinner keyframe animation
const styleEl = document.createElement("style")
styleEl.textContent = `@keyframes smart-cc-spin{to{transform:rotate(360deg)}}`
document.head?.appendChild(styleEl)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeRound(val: any): number {
  const n = Number(val)
  return isNaN(n) || !isFinite(n) ? 0 : Math.round(n)
}

// ─── DOM Scraping ─────────────────────────────────────────────────────────────

function parseAmount(text: string): number {
  const cleaned = text.replace(/[^\d.]/g, "")
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

function trySelectors(selectors: string[]): number | null {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el?.textContent) {
        const val = parseAmount(el.textContent)
        if (val > 0) return val
      }
    } catch {}
  }
  return null
}

// Check if current page is a cart/checkout page
function isCartPage(): boolean {
  const url = window.location.href.toLowerCase()
  const path = window.location.pathname.toLowerCase()
  const cartPatterns = /\/cart|\/checkout|\/basket|\/viewcart|\/shoppingbag|\/order-review|\/payment|\/pay/
  return cartPatterns.test(url) || cartPatterns.test(path)
}

// Smart scanner: looks for the FINAL cart total (after discounts), avoids MRP/subtotal
function scanCartTotal(): number | null {
  // High-priority labels (the real final amount)
  const finalLabels = /\bamount payable\b|\byou pay\b|\bfinal amount\b|\btotal amount\b|\bto pay\b|\bpay now\b/i
  // Medium-priority labels
  const totalLabels = /\bgrand total\b|\border total\b|\bcart total\b|\bbasket total\b|\bcombined total\b/i
  // Labels to AVOID (subtotals, MRP, pre-discount)
  const avoidLabels = /\bmrp\b|\bsubtotal\b|\bsub total\b|\boriginal\b|\blist price\b|\bmarked price\b|\bproduct total\b/i

  const candidates: { amount: number; score: number }[] = []
  const elements = document.querySelectorAll("div, span, p, td, th, li, dt, strong, b, h1, h2, h3, h4")

  for (const el of elements) {
    const text = (el.textContent?.trim() || "").substring(0, 120)
    if (!text || text.length > 120) continue

    // Skip elements with avoid-labels
    if (avoidLabels.test(text)) continue

    let score = 0
    if (finalLabels.test(text)) {
      score = 200 // Highest priority
    } else if (totalLabels.test(text)) {
      score = 100 // Medium priority
    } else {
      continue // Only process labeled elements
    }

    // Search parent/closest container for ₹ amounts
    const searchEl = el.closest("div, tr, li, section, dl") || el.parentElement || el
    const searchText = searchEl.textContent?.trim() || ""
    const matches = searchText.matchAll(/₹\s*([\d,]+\.?\d{0,2})/g)

    for (const match of matches) {
      const val = parseAmount(match[1])
      if (val >= 50 && val <= 500000) {
        // Bonus: the amount closest to the label in the DOM gets higher score
        const idx = searchText.indexOf(match[0])
        const labelIdx = searchText.search(totalLabels)
        const proximity = labelIdx >= 0 ? Math.abs(idx - labelIdx) : 500
        candidates.push({ amount: val, score: score + Math.max(0, 100 - proximity) })
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score)
    console.log("[Smart CC] Total-label candidates:", candidates.slice(0, 5))
    return candidates[0].amount
  }

  // Priority 2: Only scan cart/checkout containers if page looks like a cart
  if (isCartPage()) {
    const cartContainers = document.querySelectorAll(
      "[class*='cart-summary'], [class*='CartSummary'], [class*='cart-total'], " +
      "[class*='checkout-summary'], [class*='price-summary'], [class*='price-details'], " +
      "[class*='total-payable'], [class*='TotalPayable'], [class*='amount-payable'], " +
      "[id*='cart'], [id*='checkout'], [class*='bill'], [class*='Bill'], " +
      "[class*='summary'], [class*='Summary'], [class*='payable'], " +
      "aside, #right-panel, .right-panel"
    )
    for (const container of cartContainers) {
      const text = container.textContent?.trim() || ""

      // Skip containers that mention MRP prominently
      if (/\bmrp\b.*₹|₹.*\bmrp\b/i.test(text.substring(0, 100))) continue

      // Try regex: "Total Payable" or "Amount Payable" followed by ₹
      let match = text.match(/(?:total\s*payable|amount\s*payable|total\s*amount).*?₹\s*([\d,]+\.?\d{0,2})/i)
      if (match) {
        const val = parseAmount(match[1])
        console.log("[Smart CC] Cart container 'payable':", val)
        return val
      }

      // Try: "Grand Total" or "Total" as last resort
      match = text.match(/(?:grand\s*total|order\s*total).*?₹\s*([\d,]+\.?\d{0,2})/i)
      if (match) {
        const val = parseAmount(match[1])
        console.log("[Smart CC] Cart container 'grand total':", val)
        return val
      }

      // Fallback: pick the LAST ₹ amount in the container (totals are typically at the bottom)
      const matches = Array.from(text.matchAll(/₹\s*([\d,]+\.?\d{0,2})/g))
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1]
        const val = parseAmount(lastMatch[1])
        console.log("[Smart CC] Cart container last ₹:", container.className || container.id, val)
        return val
      }
    }

    // Also check for "Total" rows specifically
    const totalRows = document.querySelectorAll(
      "div, li, tr, [class*='row'], [class*='Row']"
    )
    for (const row of totalRows) {
      const text = (row.textContent?.trim() || "").substring(0, 80)
      if (!text) continue
      // Match rows that are JUST a label + ₹ amount (like "Total Payable  ₹12,345")
      const totalMatch = text.match(/^(?:total\s*payable|amount\s*payable|grand\s*total|total).*?₹\s*([\d,]+\.?\d{0,2})\s*$/i)
      if (totalMatch) {
        const val = parseAmount(totalMatch[1])
        if (val >= 50 && val <= 500000) {
          console.log("[Smart CC] Total row found:", val)
          return val
        }
      }
    }
  }

  return null
}

const EXTRACTORS: Record<string, () => number | null> = {
  amazon: () => trySelectors([
    ".grand-total-price", "#sc-subtotal-amount-buybox",
    ".a-price .a-offscreen", "#priceblock_ourprice",
    "[data-feature-name='checkout'] .grand-total-price",
    "#subtotal_amount", ".sc-subtotal span",
  ]),
  flipkart: () => {
    // Find "Total Payable" or "Amount Payable" text, then grab ₹ from its container
    const allDivs = document.querySelectorAll("div, span, p")
    for (const el of allDivs) {
      const text = el.textContent?.trim() || ""
      // Match elements whose text is exactly "Total Payable" or "Amount Payable"
      if (/^(total payable|amount payable)$/i.test(text)) {
        // Found the label — now search upward for the ₹ amount
        const container = el.closest("div, section, li") || el.parentElement
        if (container) {
          const rMatch = container.textContent?.match(/₹\s*([\d,]+\.?\d{0,2})/)
          if (rMatch) {
            const val = parseAmount(rMatch[1])
            if (val > 0) {
              console.log("[Smart CC] Flipkart Total Payable found:", val)
              return val
            }
          }
        }
      }
    }
    // Also try specific class-based selectors
    return trySelectors(["._2K7VCj", "._3dGepM", "._1YokD2 ._2K7VCj", "div._16Jk6d"])
  },
  swiggy: () => trySelectors(["._3L1X9", "._2NPi4", "._2EQ3T", ".P2RtN", ".LJqjv"]),
  zomato: () => trySelectors([".sc-1s0saks-15", "[data-testid='cart-total']", ".bbGZIq"]),
  myntra: () => trySelectors([".price-base-price", ".pdp-price", ".price", ".bulletedStrip-price", ".pdp-final-price"]),
  blinkit: () => trySelectors([".basket-total-amount", "[data-testid='basket-total']", ".total-amount"]),
  makemytrip: () => trySelectors([".totalFare", ".fareSummaryTotal", ".totalPrice", ".rupeeTotal"]),
  bigbasket: () => trySelectors([".total-price", ".Pricing__total", "[data-qa='totalAmount']"]),
  cleartrip: () => trySelectors([".totalFare", ".total-amount", ".fare-summary-total"]),
  goibibo: () => trySelectors([".totalFare", ".fareSummaryTotal", ".total-price"]),
  irctc: () => trySelectors(["#total_fare", ".totalFare", ".cart-total"]),
  uber: () => trySelectors(["[data-testid='fare-estimate']", ".fare-price"]),
}

function getMerchantConfig(hostname: string) {
  const known: Record<string, { name: string; key: string }> = {
    "amazon.in": { name: "Amazon", key: "amazon" },
    "amazon.com": { name: "Amazon", key: "amazon" },
    "flipkart.com": { name: "Flipkart", key: "flipkart" },
    "swiggy.com": { name: "Swiggy", key: "swiggy" },
    "zomato.com": { name: "Zomato", key: "zomato" },
    "myntra.com": { name: "Myntra", key: "myntra" },
    "blinkit.com": { name: "Blinkit", key: "blinkit" },
    "makemytrip.com": { name: "MakeMyTrip", key: "makemytrip" },
    "uber.com": { name: "Uber", key: "uber" },
    "bigbasket.com": { name: "BigBasket", key: "bigbasket" },
    "cleartrip.com": { name: "Cleartrip", key: "cleartrip" },
    "goibibo.com": { name: "Goibibo", key: "goibibo" },
    "irctc.co.in": { name: "IRCTC", key: "irctc" },
  }
  for (const [domain, config] of Object.entries(known)) {
    if (hostname.includes(domain.replace("www.", ""))) return config
  }
  return null
}

function extractAmount(hostname: string): number {
  const merchant = getMerchantConfig(hostname)
  console.log("[Smart CC] Detected merchant:", merchant?.name || "unknown")

  if (merchant) {
    const extractor = EXTRACTORS[merchant.key]
    if (extractor) {
      const result = extractor()
      if (result > 0) {
        console.log("[Smart CC] Site-specific extractor found:", result)
        return result
      }
    }
  }

  // Smart cart total scanner
  const scanned = scanCartTotal()
  if (scanned && scanned > 0) {
    console.log("[Smart CC] Cart scanner found:", scanned)
    return scanned
  }

  console.log("[Smart CC] No amount found on this page")
  return 0
}

// ─── Orb Component ────────────────────────────────────────────────────────────

function SmartCCOrb() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [merchant, setMerchant] = useState<any>(null)
  const [cartAmount, setCartAmount] = useState<number>(0)
  const [recommendation, setRecommendation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const hostname = window.location.hostname
    const mc = getMerchantConfig(hostname)
    const config = mc || { name: hostname.replace(/^www\./, "").split(".")[0], key: "generic" }
    setMerchant(config)

    const amount = extractAmount(hostname)
    setCartAmount(amount)

    const intervalId = setInterval(() => {
      const fresh = extractAmount(hostname)
      if (fresh && fresh !== amount) setCartAmount(fresh)
    }, 3000)
    return () => clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (merchant && cartAmount > 0) {
      setIsLoading(true)
      try {
        chrome.runtime.sendMessage({ type: "FETCH_RECOMMENDATION", payload: { merchant_name: merchant.key, amount: cartAmount } })
      } catch {}
    }
  }, [merchant, cartAmount])

  useEffect(() => {
    if (!merchant) return
    const poll = () => {
      try {
        chrome.runtime.sendMessage({ type: "GET_LATEST_RECOMMENDATION" }, (res: any) => {
          if (chrome.runtime.lastError) return
          if (res) { setRecommendation(res); setIsLoading(false) }
        })
      } catch {}
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [merchant])

  const bestCard = recommendation?.best_balanced_card
  const altCards = recommendation?.all_ranked_cards?.slice(1, 3) || []

  // Only show orb on: cart/checkout pages, or known merchants with real amounts
  const isKnown = !!getMerchantConfig(window.location.hostname)
  const onCartPage = isCartPage()
  if (!onCartPage && !isKnown) return null

  return (
    <div style={{ fontFamily: "IBM Plex Sans, sans-serif" }}>
      {/* Backdrop */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(20,20,43,0.2)",
            backdropFilter: "blur(4px)", zIndex: 2147483640,
          }}
        />
      )}

      {/* Expanded Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 360, maxWidth: "100vw",
        background: "#FFFFFF", boxShadow: "-8px 0 40px rgba(20,20,43,0.15)",
        borderLeft: "1px solid #E7E8F0", zIndex: 2147483648,
        transform: isExpanded ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #E7E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={16} color="#4F36FF" />
            <span style={{ fontWeight: 600, fontSize: 14, color: "#14142B" }}>Smart CC</span>
          </div>
          <button onClick={() => setIsExpanded(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#666A80", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {/* Merchant info */}
          <div style={{ background: "#F8F8FC", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div><p style={{ fontWeight: 600, fontSize: 14, textTransform: "capitalize", margin: "0 0 2px" }}>{merchant?.name}</p><p style={{ fontSize: 11, color: "#666A80", margin: 0 }}>Merchant detected</p></div>
            <div style={{ textAlign: "right" }}><p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>₹{cartAmount}</p><p style={{ fontSize: 11, color: "#666A80", margin: 0 }}>Amount</p></div>
          </div>
          {isLoading && !recommendation ? (
            <div style={{ textAlign: "center", padding: 30 }}><Loader2 size={28} color="#4F36FF" style={{ animation: "smart-cc-spin 1s linear infinite" }} /><p style={{ color: "#666A80", marginTop: 10, fontSize: 13 }}>Analyzing your cards...</p></div>
          ) : bestCard ? (
            <>
              {/* Best Card Hero */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#666A80", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>Best Card</span>
                <div style={{
                  position: "relative",
                  border: "1px solid rgba(79,54,255,0.3)",
                  background: "linear-gradient(to bottom right, rgba(79, 54, 255, 0.1), rgba(255, 255, 255, 0.9))",
                  borderRadius: 14,
                  padding: "12px 12px 12px 16px",
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: "linear-gradient(to bottom, #4F36FF, #FF8A3D)" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ background: "rgba(79,54,255,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: "#4F36FF", letterSpacing: 1, textTransform: "uppercase" }}>{bestCard.confidence_label || "OPTIMAL"}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#666A80", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 2px" }}>{bestCard.bank_name || "BANK"}</p>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "#14142B", margin: 0 }}>{bestCard.card_name}</p>
                  </div>
                  <p style={{ fontSize: 12, color: "#666A80", margin: "0 0 12px", lineHeight: 1.4 }}>{bestCard.explanation || "Optimal choice for this transaction."}</p>
                  <div style={{ borderTop: "1px solid #E7E8F0", paddingTop: 10 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: "#22C55E" }}>₹{safeRound(bestCard.immediate_reward_value)}</span>
                      {bestCard.fee_waiver_progress_impact > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "#4F36FF" }}>+ ₹{safeRound(bestCard.fee_waiver_progress_impact)} fee waiver</span>}
                    </div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: "#666A80", textTransform: "uppercase", letterSpacing: 1, margin: "2px 0 0" }}>Expected Reward</p>
                  </div>
                </div>
              </div>

              {/* Rewards breakdown */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <div style={{ background: bestCard.cashback_amount > 0 ? "rgba(34,197,94,0.08)" : "#F8F8FC", borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#666A80", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Cashback</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#22C55E", margin: 0 }}>₹{safeRound(bestCard.cashback_amount)}</p>
                  <p style={{ fontSize: 9, color: "#666A80", margin: "2px 0 0" }}>Instant savings</p>
                </div>
                <div style={{ background: bestCard.reward_points > 0 ? "rgba(139,92,246,0.08)" : "#F8F8FC", borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#666A80", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Reward Points</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#8B5CF6", margin: 0 }}>{bestCard.reward_points ? safeRound(bestCard.reward_points) : "—"}</p>
                  <p style={{ fontSize: 9, color: "#666A80", margin: "2px 0 0" }}>Points earned</p>
                </div>
                <div style={{ background: "#F8F8FC", borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#666A80", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Reward Rate</p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#4F36FF", margin: 0 }}>{cartAmount > 0 ? `${((bestCard.immediate_reward_value / cartAmount) * 100).toFixed(1)}%` : "—"}</p>
                  <p style={{ fontSize: 9, color: "#666A80", margin: "2px 0 0" }}>Of purchase amount</p>
                </div>
                <div style={{ background: "#F8F8FC", borderRadius: 10, padding: 12 }}>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#666A80", textTransform: "uppercase", marginBottom: 4, marginTop: 0 }}>Annual Fee Help</p>
                  <div style={{ width: "100%", height: 3, background: "#E7E8F0", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ height: "100%", background: "#22C55E", borderRadius: 2, width: `${Math.min(100, safeRound(bestCard.fee_waiver_progress_impact * 100))}%` }} />
                  </div>
                  <p style={{ fontSize: 9, color: "#666A80", margin: 0 }}>{bestCard.fee_waiver_progress_impact > 0 ? `+${safeRound(bestCard.fee_waiver_progress_impact * 100)}% toward fee waiver` : "No waiver progress"}</p>
                </div>
              </div>

              {/* Engine explanations */}
              {bestCard.engine_explanations?.length > 0 && (
                <div style={{ background: "#F8F8FC", borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <TrendingUp size={14} color="#4F36FF" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#14142B", textTransform: "uppercase" }}>Why this card</span>
                  </div>
                  {bestCard.engine_explanations.map((exp: string, i: number) => (
                    <p key={i} style={{ fontSize: 12, color: "#666A80", lineHeight: 1.6, margin: "3px 0", paddingLeft: 10, borderLeft: "2px solid rgba(79,54,255,0.2)" }}>{exp}</p>
                  ))}
                </div>
              )}

              {/* Alternative cards */}
              {altCards.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#666A80", textTransform: "uppercase", marginBottom: 10, display: "block" }}>Alternatives</span>
                  {altCards.map((alt: any, i: number) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, background: "#F8F8FC", borderRadius: 10, marginBottom: 6 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#14142B" }}>{alt.card_name}</span>
                        <div style={{ display: "flex", gap: 8, marginTop: 3, fontSize: 10 }}>
                          <span style={{ color: "#666A80", textTransform: "capitalize" }}>{alt.reward_type}</span>
                          {alt.cashback_amount > 0 && <span style={{ color: "#22C55E" }}>₹{safeRound(alt.cashback_amount)} cashback</span>}
                          {alt.reward_points > 0 && <span style={{ color: "#8B5CF6" }}>{safeRound(alt.reward_points)} pts</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "#14142B" }}>₹{safeRound(alt.immediate_reward_value)}</span>
                        <p style={{ fontSize: 9, color: "#666A80", margin: 0 }}>{cartAmount > 0 ? `${((alt.immediate_reward_value / cartAmount) * 100).toFixed(1)}%` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : recommendation ? (
            <div style={{ textAlign: "center", padding: 30 }}>
              <AlertTriangle size={32} color="#FF8A3D" />
              <p style={{ fontWeight: 500, marginTop: 10, fontSize: 14 }}>No optimized card found</p>
              <p style={{ fontSize: 12, color: "#666A80" }}>Consider adding a card for {merchant?.name}</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Floating Capsule */}
      {!isExpanded && (
      <div style={{ position: "fixed", top: "50%", right: 12, transform: "translateY(-50%)", zIndex: 2147483647 }}>
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            height: 42, minWidth: 42, padding: "0 14px", borderRadius: 9999,
            background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(79,54,255,0.1)",
            boxShadow: "0 4px 24px rgba(79,54,255,0.15)",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {isLoading && !recommendation ? (
            <Loader2 size={18} color="#4F36FF" style={{ animation: "smart-cc-spin 1s linear infinite" }} />
          ) : recommendation ? (
            bestCard ? (
              <span style={{ fontWeight: 700, fontSize: 15, color: "#4F36FF" }}>₹{safeRound(bestCard.immediate_reward_value)}</span>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 15, color: "#FF8A3D" }}>+₹0</span>
            )
          ) : (
            <Sparkles size={18} color="#4F36FF" />
          )}
          {bestCard && <ChevronRight size={14} color="rgba(79,54,255,0.5)" />}
        </button>
      </div>
      )}
    </div>
  )
}

// ─── Mount directly to document.body ──────────────────────────────────────────

const ROOT_ID = "smart-cc-orb-root"
if (!document.getElementById(ROOT_ID)) {
  const container = document.createElement("div")
  container.id = ROOT_ID
  container.style.position = "fixed"
  container.style.top = "0"
  container.style.left = "0"
  container.style.width = "100vw"
  container.style.height = "100vh"
  container.style.pointerEvents = "none"
  container.style.zIndex = "2147483647"
  document.body.appendChild(container)

  // React renders inside this wrapper; children can use pointer-events: auto
  const inner = document.createElement("div")
  inner.style.pointerEvents = "auto"
  container.appendChild(inner)

  const root = createRoot(inner)
  root.render(<SmartCCOrb />)
}

export default function ContentScript() {
  return null
}
