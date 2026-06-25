import { useEffect, useState } from "react"
import { getCards, getPersonalitySnapshot } from "../api/client"
import { SkeletonBox } from "../components/ui/SkeletonBox"
import { ErrorBanner } from "../components/ui/ErrorBanner"
import { CreditCard, Search, Brain, ChevronRight, Wallet, TrendingUp } from "lucide-react"

export function WalletTab() {
  const [cards, setCards] = useState<any[]>([])
  const [personality, setPersonality] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCard, setSelectedCard] = useState<any>(null)

  const loadData = async () => {
    setIsLoading(true); setError(null)
    try {
      const [cardData, pers] = await Promise.all([getCards(), getPersonalitySnapshot().catch(() => null)])
      setCards(Array.isArray(cardData) ? cardData : cardData?.cards || [])
      setPersonality(pers)
    } catch (err: any) { setError(err.message) }
    finally { setIsLoading(false) }
  }
  useEffect(() => { loadData() }, [])

  const filteredCards = cards.filter((c: any) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return ((c.card_details?.card_name || "") + (c.nickname || "") + (c.card_details?.bank_name || "") + (c.card_details?.network || "")).toLowerCase().includes(q)
  })

  const annualFees = cards.reduce((s: number, c: any) => s + (Number(c.card_details?.annual_fee) || 0), 0)
  const waiverProgress = cards.reduce((s: number, c: any) => s + (c.fee_waiver_progress_percent || 0), 0)
  const waiverTarget = cards.reduce((s: number, c: any) => s + (Number(c.fee_waiver_threshold) || 0), 0)

  const networkColors: Record<string, string> = { visa: "#1E3A8A", mastercard: "#881337", amex: "#1E3A8A", discover: "#9A3412" }

  return (
    <div className="plasmo-flex-1 plasmo-overflow-y-auto plasmo-p-6">
      {/* Header */}
      <div className="plasmo-mb-6">
        <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
          <h2 className="plasmo-text-display plasmo-font-extrabold plasmo-tracking-tightest plasmo-text-text-primary">Wallet</h2>
          {cards.length > 0 && <span className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-bg-background plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">{cards.length} CARDS</span>}
        </div>
        <p className="plasmo-text-body plasmo-font-medium plasmo-text-text-secondary plasmo-mt-1">Manage your active cards</p>
      </div>

      {/* Personality Lens */}
      {personality && (
        <div className="plasmo-flex plasmo-items-center plasmo-gap-3 plasmo-bg-primary-soft plasmo-border plasmo-border-primary/20 plasmo-rounded-card plasmo-p-4 plasmo-mb-5">
          <div className="plasmo-w-8 plasmo-h-8 plasmo-rounded-full plasmo-bg-primary/20 plasmo-flex plasmo-items-center plasmo-justify-center">
            <Brain className="plasmo-w-4 plasmo-h-4 plasmo-text-primary" />
          </div>
          <div>
            <p className="plasmo-text-body plasmo-font-semibold plasmo-text-primary">Portfolio Persona: {personality?.persona_label || "Balanced Optimizer"}</p>
            <p className="plasmo-text-caption plasmo-text-text-secondary">{personality?.behavioral_signal || "Optimizing across your card portfolio"}</p>
          </div>
        </div>
      )}

      {/* Fee Waiver Stats */}
      {waiverTarget > 0 && (
        <div className="plasmo-flex plasmo-gap-3 plasmo-mb-5">
          <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">Annual Fees</p>
            <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary">₹{annualFees}</p>
          </div>
          <div className="plasmo-flex-1 plasmo-p-4 plasmo-rounded-card plasmo-bg-success-soft plasmo-border plasmo-border-success/20">
            <p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wider plasmo-text-text-secondary plasmo-mb-1">Fee Waivers</p>
            <p className="plasmo-text-title plasmo-font-bold plasmo-text-success">₹{waiverProgress}{waiverTarget > 0 && <span className="plasmo-text-caption plasmo-text-text-secondary"> / ₹{waiverTarget}</span>}</p>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={loadData} />}

      {isLoading && (
        <div className="plasmo-space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="plasmo-p-4 plasmo-rounded-card plasmo-bg-surface plasmo-border plasmo-border-border">
              <SkeletonBox width="40%" height="10px" className="plasmo-mb-2" />
              <SkeletonBox width="60%" height="16px" className="plasmo-mb-3" />
              <div className="plasmo-flex plasmo-gap-2"><SkeletonBox width="60px" height="20px" /><SkeletonBox width="80px" height="20px" /></div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && cards.length === 0 && (
        <div className="plasmo-text-center plasmo-py-16">
          <div className="plasmo-w-16 plasmo-h-16 plasmo-rounded-full plasmo-bg-background plasmo-flex plasmo-items-center plasmo-justify-center plasmo-mx-auto plasmo-mb-5">
            <CreditCard className="plasmo-w-8 plasmo-h-8 plasmo-text-text-muted" strokeWidth={1.5} />
          </div>
          <p className="plasmo-text-title plasmo-font-bold plasmo-text-text-primary plasmo-mb-2">No cards yet</p>
          <p className="plasmo-text-body plasmo-text-text-secondary plasmo-max-w-xs plasmo-mx-auto plasmo-mb-6">Add your credit cards to start tracking rewards and fee waivers</p>
          <button onClick={loadData} className="plasmo-bg-primary-soft plasmo-text-primary plasmo-py-3 plasmo-px-8 plasmo-rounded-full plasmo-font-bold plasmo-text-body plasmo-cursor-pointer hover:plasmo-bg-primary/10 plasmo-transition-colors">Refresh</button>
        </div>
      )}

      {/* Search */}
      {cards.length > 1 && !isLoading && (
        <div className="plasmo-relative plasmo-mb-5">
          <Search className="plasmo-absolute plasmo-left-3 plasmo-top-1/2 -plasmo-translate-y-1/2 plasmo-w-4 plasmo-h-4 plasmo-text-text-muted" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, bank or network..."
            className="plasmo-w-full plasmo-bg-background plasmo-border plasmo-border-border plasmo-rounded-lg plasmo-pl-10 plasmo-pr-4 plasmo-py-3 plasmo-text-body plasmo-text-text-primary placeholder:plasmo-text-text-muted focus:plasmo-outline-none focus:plasmo-border-primary plasmo-transition-colors" />
        </div>
      )}

      {/* Card List */}
      {!isLoading && filteredCards.length > 0 && (
        <div className="plasmo-space-y-3">
          {filteredCards.map((card: any) => {
            const network = (card.card_details?.network || "default").toLowerCase()
            const stripeColor = networkColors[network] || "#64748B"
            return (
              <button key={card.id} onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                className={`plasmo-w-full plasmo-text-left plasmo-bg-surface plasmo-border plasmo-rounded-card plasmo-p-4 plasmo-overflow-hidden plasmo-relative plasmo-transition-colors hover:plasmo-bg-background ${selectedCard?.id === card.id ? "plasmo-border-primary/30" : "plasmo-border-border"}`}>
                <div className="plasmo-absolute plasmo-left-0 plasmo-top-0 plasmo-bottom-0 plasmo-w-[3px]" style={{ backgroundColor: stripeColor }} />
                <div className="plasmo-flex plasmo-justify-between plasmo-items-start">
                  <div className="plasmo-flex-1 plasmo-min-w-0">
                    <div className="plasmo-flex plasmo-items-center plasmo-gap-2 plasmo-mb-1">
                      <span className="plasmo-text-caption plasmo-text-text-secondary">{card.card_details?.bank_name}</span>
                      {card.card_details?.network && <span className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted plasmo-bg-background plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">{card.card_details?.network}</span>}
                    </div>
                    <p className="plasmo-text-body-lg plasmo-font-semibold plasmo-text-text-primary plasmo-mb-2">{card.card_details?.card_name}{card.nickname && <span className="plasmo-text-text-secondary plasmo-font-normal"> ({card.nickname})</span>}</p>
                    {card.fee_waiver_threshold > 0 && (
                      <div className="plasmo-mt-2">
                        <div className="plasmo-flex plasmo-justify-between plasmo-mb-1"><span className="plasmo-text-caption plasmo-text-text-muted">Fee Waiver</span><span className="plasmo-text-caption plasmo-font-medium plasmo-text-text-secondary">{Math.round(card.fee_waiver_progress_percent || 0)}%</span></div>
                        <div className="plasmo-w-full plasmo-h-1.5 plasmo-bg-background plasmo-rounded-full plasmo-overflow-hidden"><div className="plasmo-h-full plasmo-bg-primary plasmo-rounded-full" style={{ width: `${Math.min(100, card.fee_waiver_progress_percent || 0)}%` }} /></div>
                      </div>
                    )}
                  </div>
                  {card.card_details?.annual_fee > 0 && (
                    <div className="plasmo-text-right plasmo-ml-4 plasmo-shrink-0">
                      <p className="plasmo-text-micro plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted">Annual Fee</p>
                      <p className="plasmo-text-body plasmo-font-semibold plasmo-text-text-primary">₹{card.card_details?.annual_fee}</p>
                    </div>
                  )}
                  <ChevronRight className="plasmo-w-4 plasmo-h-4 plasmo-text-text-muted plasmo-ml-2 plasmo-shrink-0" />
                </div>

                {selectedCard?.id === card.id && (
                  <div className="plasmo-mt-4 plasmo-pt-4 plasmo-border-t plasmo-border-border">
                    <div className="plasmo-grid plasmo-grid-cols-2 plasmo-gap-3">
                      {card.card_details?.network && <div><p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted">Network</p><p className="plasmo-text-body plasmo-font-medium plasmo-text-text-primary">{card.card_details.network}</p></div>}
                      {card.card_details?.base_point_value && <div><p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted">Base Value</p><p className="plasmo-text-body plasmo-font-medium plasmo-text-text-primary">{card.card_details.base_point_value}x</p></div>}
                    </div>
                    {card.card_details?.best_for?.length > 0 && (
                      <div className="plasmo-mt-3"><p className="plasmo-text-caption plasmo-font-bold plasmo-uppercase plasmo-tracking-wide plasmo-text-text-muted plasmo-mb-1.5">Best For</p>
                        <div className="plasmo-flex plasmo-flex-wrap plasmo-gap-1">{card.card_details.best_for.map((c: string) => <span key={c} className="plasmo-text-caption plasmo-bg-background plasmo-text-text-secondary plasmo-px-2 plasmo-py-0.5 plasmo-rounded-full">{c}</span>)}</div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
