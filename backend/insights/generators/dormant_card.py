import hashlib
from datetime import datetime, timezone

from insights.generators.base import InsightGenerator
from insights.schemas import (
    ConfidenceLevel,
    InsightCategory,
    InsightPriority,
    InsightResponse,
)
from insights.enrichment.transaction_enrichment import EnrichedTransaction
from models.user_card import UserCard


class DormantCardGenerator(InsightGenerator):
    """Identifies fee-bearing cards with negligible usage that are candidates for closure.

    A card triggers this insight when it is actively costing the user money
    (annual fee > 0) while providing essentially zero value (no spending,
    no fee waiver progress, no recent activity).
    """

    # Thresholds
    MIN_DAYS_INACTIVE = 60          # Cards unused for 60+ days are suspect
    MIN_ANNUAL_FEE = 100            # Only flag cards with meaningful fees
    MAX_SPEND_FOR_DORMANT = 2000    # Below this INR, a paid card is likely dead weight
    WAIVER_PROGRESS_DEAD = 25.0     # Below 25% progress toward waiver → not trying

    def generate(
        self, user_id: str, cards: list[UserCard], transactions: list[EnrichedTransaction]
    ) -> list[InsightResponse]:
        insights: list[InsightResponse] = []
        now = datetime.now(timezone.utc)

        # Track last usage per card
        last_used: dict[str, datetime] = {}
        for tx in transactions:
            if tx.card_id:
                try:
                    tx_date = datetime.fromisoformat(tx.date.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    continue
                if tx.card_id not in last_used or tx_date > last_used[tx.card_id]:
                    last_used[tx.card_id] = tx_date

        from cards.enums import is_card_eligible_for_recommendation

        for card in cards:
            if not is_card_eligible_for_recommendation(card.card_status):
                continue

            annual_fee = float(card.effective_annual_fee) if card.effective_annual_fee else 0
            if annual_fee < self.MIN_ANNUAL_FEE:
                continue  # LTF or negligible fee — no harm in keeping it

            annual_spend = float(card.annual_spend) if card.annual_spend else 0
            card_name = card.nickname or (card.card_catalog.card_name if card.card_catalog else "Your card")

            # Determine inactivity
            last_usage = last_used.get(str(card.id))
            if last_usage:
                if last_usage.tzinfo is None:
                    last_usage = last_usage.replace(tzinfo=timezone.utc)
                days_inactive = (now - last_usage).days
            else:
                days_inactive = 90  # No transactions at all

            # Determine waiver progress
            threshold = card.effective_fee_waiver_threshold
            if threshold and float(threshold) > 0:
                waiver_pct = (annual_spend / float(threshold)) * 100
            else:
                waiver_pct = 0

            # ── Gate: is this card genuinely dormant? ──
            dormant = False
            reasons: list[str] = []

            if days_inactive >= self.MIN_DAYS_INACTIVE and annual_spend < self.MAX_SPEND_FOR_DORMANT:
                dormant = True
                reasons.append(f"unused for {days_inactive} days with only ₹{annual_spend:,.0f} in annual spend")
            elif annual_spend < self.MAX_SPEND_FOR_DORMANT and waiver_pct < self.WAIVER_PROGRESS_DEAD and annual_fee >= 500:
                dormant = True
                reasons.append(
                    f"₹{annual_spend:,.0f} annual spend ({waiver_pct:.0f}% toward ₹{annual_fee:,.0f} waiver)"
                )
            elif days_inactive >= 90 and annual_fee >= 500:
                dormant = True
                reasons.append(f"completely unused for 90+ days with a ₹{annual_fee:,.0f} annual fee")

            if not dormant:
                continue

            # ── Priority ──
            if annual_fee >= 1000 and days_inactive >= 90:
                priority = InsightPriority.HIGH
            elif annual_fee >= 500 and (days_inactive >= 60 or annual_spend < 500):
                priority = InsightPriority.MEDIUM
            else:
                priority = InsightPriority.INFORMATIONAL

            # ── Monetary value: what they'd save by closing ──
            monetary_value = annual_fee

            # ── Build deterministic hash (changes every 15 days so it resurfaces) ──
            hash_str = f"DORMANT_{card.id}_{days_inactive // 15}"
            insight_hash = hashlib.sha256(hash_str.encode()).hexdigest()

            # ── Compose the insight ──
            if last_usage:
                last_used_str = f"Last used {days_inactive} days ago."
            else:
                last_used_str = "Never used since being added."

            detail = "; ".join(reasons)

            insight = InsightResponse(
                id=f"dormant_{card.id}",
                category=InsightCategory.DORMANT_CARD,
                priority=priority,
                confidence=ConfidenceLevel.HIGH,
                title="Dormant Card",
                summary=(
                    f"{card_name} has ₹{annual_spend:,.0f} in annual spend "
                    f"against a ₹{annual_fee:,.0f} annual fee. {last_used_str} "
                    f"Closing it would save ₹{annual_fee:,.0f}/year."
                ),
                reasoning=f"Dormant — {detail}",
                badge_label="DORMANT",
                badge_color="#EF4444",  # Red
                related_card_id=str(card.id),
                monetary_value=monetary_value,
                source_transactions=[],
                actionability_score=85,  # High — closing a card is straightforward
                insight_hash=insight_hash,
                cooldown_period_hours=24 * 14,  # 14-day cooldown
            )
            insights.append(insight)

        return insights
