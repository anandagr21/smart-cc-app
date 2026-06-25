import { Storage } from "@plasmohq/storage"

export const API_URL = "http://localhost:8000/api/v1"
console.log("[Smart CC API] Using backend URL:", API_URL)

const storage = new Storage()

// ── Auth header helper ─────────────────────────────────────────────────────

async function getAuthHeaders() {
  const token = await storage.get("access_token")
  console.log("[Smart CC API] getAuthHeaders — token found:", !!token)
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export type RecommendationRequest = {
  merchant_name: string
  amount: number
  payment_mode?: string
  intent?: "MAX_REWARDS" | "PRESERVE_FEE_WAIVER" | "BALANCED" | "SIMPLIFY"
}

export type OptimizerRankedCard = {
  card_id: string
  card_name: string
  immediate_reward_value: number
  fee_waiver_progress_impact: number
  simplification_score: number
  blended_total_value: number
  explanation: string
  confidence_label: string
  reward_type: string
  cashback_amount: number
  reward_points: number | null
  engine_explanations: string[]
}

export type RecommendationResponse = {
  data: {
    calculation_id: string
    resolved_merchant_name: string
    merchant_id?: string
    best_balanced_card: OptimizerRankedCard
    all_ranked_cards: OptimizerRankedCard[]
    explanations: string[]
  }
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginWithGoogle(idToken: string) {
  console.log("[Smart CC API] loginWithGoogle — idToken length:", idToken?.length)
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!response.ok) {
    const errText = await response.text()
    console.error("[Smart CC API] loginWithGoogle failed:", response.status, errText)
    throw new Error(`Google login failed: ${errText}`)
  }
  const data = await response.json()
  console.log("[Smart CC API] loginWithGoogle success, storing token & user")
  await storage.set("access_token", data.data.access_token)
  await storage.set("user", data.data.user)
  return data.data
}

export async function logout() {
  console.log("[Smart CC API] logout")
  await storage.remove("access_token")
  await storage.remove("user")
}

export async function getUserProfile() {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch user profile")
  const data = await response.json()
  return data.data
}

// ── Cards ──────────────────────────────────────────────────────────────────

export async function getCards() {
  console.log("[Smart CC API] getCards")
  const response = await fetch(`${API_URL}/cards`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to fetch cards: ${err}`)
  }
  const data = await response.json()
  return data.data
}

export async function getCardDetail(cardId: string) {
  const response = await fetch(`${API_URL}/cards/${cardId}`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch card detail")
  const data = await response.json()
  return data.data
}

export async function addCard(request: {
  card_name: string
  bank_name?: string
  network?: string
  annual_fee?: number
  nickname?: string
}) {
  const response = await fetch(`${API_URL}/cards`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify(request),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Failed to add card: ${err}`)
  }
  const data = await response.json()
  return data.data
}

export async function removeCard(cardId: string) {
  const response = await fetch(`${API_URL}/cards/${cardId}`, {
    method: "DELETE",
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to remove card")
  return true
}

// ── Recommendations ────────────────────────────────────────────────────────

export async function fetchRecommendations(
  request: RecommendationRequest
): Promise<RecommendationResponse> {
  console.log("[Smart CC API] fetchRecommendations:", request)
  const response = await fetch(`${API_URL}/recommendations/evaluate`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      merchant_name: request.merchant_name,
      amount: request.amount,
      payment_mode: request.payment_mode || "ONLINE",
      intent: request.intent || "BALANCED",
    }),
  })
  if (!response.ok) {
    const errorText = await response.text()
    console.error("[Smart CC API] fetchRecommendations failed:", response.status, errorText)
    throw new Error(`Failed to fetch recommendations: ${errorText}`)
  }
  const data = await response.json()
  console.log("[Smart CC API] fetchRecommendations success:", data?.data?.best_balanced_card?.card_name)
  return data
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function getTransactions() {
  console.log("[Smart CC API] getTransactions")
  const response = await fetch(`${API_URL}/transactions`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch transactions")
  const data = await response.json()
  return data.data
}

// ── Intelligence ───────────────────────────────────────────────────────────

export async function getMonthlyIntelligence(year: number, month: number) {
  console.log(`[Smart CC API] getMonthlyIntelligence ${year}-${month}`)
  const response = await fetch(`${API_URL}/monthly-intelligence/?year=${year}&month=${month}`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch monthly intelligence")
  const data = await response.json()
  // Returns MonthlySummaryResponse directly (not wrapped in SingleResponse)
  return data
}

export async function getSpendInsights() {
  console.log("[Smart CC API] getSpendInsights")
  const response = await fetch(`${API_URL}/insights/`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch insights")
  const data = await response.json()
  // Returns List[InsightResponse] directly (not wrapped)
  return data
}

export async function getPersonalitySnapshot() {
  console.log("[Smart CC API] getPersonalitySnapshot")
  const response = await fetch(`${API_URL}/personality/`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch personality snapshot")
  const data = await response.json()
  // Returns dict directly (not wrapped)
  return data
}

export async function getNotifications() {
  const response = await fetch(`${API_URL}/notifications`, {
    headers: await getAuthHeaders(),
  })
  if (!response.ok) throw new Error("Failed to fetch notifications")
  const data = await response.json()
  return data.data
}
