"""
Module: backend.recommendations.explainers
Responsibility: Aggregate explanations for recommendations.
"""

from __future__ import annotations

from merchants.schemas import NormalizeResponse
from reward_engine.ranking_schemas import RankingResult


def aggregate_explanations(
    normalize_res: NormalizeResponse,
    ranking_res: RankingResult,
) -> tuple[list[str], list[str]]:
    """Aggregate top-level explanations and warnings.

    Returns a tuple of (explanations, warnings).
    """
    explanations: list[str] = []
    warnings: list[str] = []

    # From normalization
    if normalize_res.canonical_name != normalize_res.raw_name:
        explanations.append(
            f"Merchant name '{normalize_res.raw_name}' normalized to '{normalize_res.canonical_name}'."
        )
    if normalize_res.category:
        explanations.append(f"Inferred category as '{normalize_res.category}'.")

    # From ranking
    if ranking_res.all_excluded:
        explanations.append("All user cards are excluded for this transaction type.")
        warnings.append("No cards provide rewards for this transaction.")
    elif not ranking_res.ranked:
        warnings.append("No cards available to rank.")

    return explanations, warnings
