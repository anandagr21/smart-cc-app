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
    if normalize_res.canonical_name and normalize_res.canonical_name != normalize_res.raw_name:
        explanations.append(f"Identified merchant as '{normalize_res.canonical_name.title()}'.")
        
    if normalize_res.category:
        cat_name = normalize_res.category.replace('_', ' ').title()
        explanations.append(f"Transaction categorized as '{cat_name}' to find the best rewards.")

    # From ranking
    if ranking_res.all_excluded:
        explanations.append("All your cards are excluded for this type of transaction.")
        warnings.append("No cards provide rewards for this transaction.")
    elif not ranking_res.ranked:
        warnings.append("No cards available to rank.")

    return explanations, warnings
