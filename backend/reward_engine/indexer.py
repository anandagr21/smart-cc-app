"""
Module: backend.reward_engine.indexer
Responsibility: Deterministic rule indexing for fast candidate resolution.

Architectural Boundaries:
- Pure Python logic — no I/O, no DB access, no mutable global state.
- Groups rules into discrete deterministic buckets (merchant, category, payment_mode, fallback).
- Instantiated per-request or per-batch (not globally) to ensure purity.
"""

from __future__ import annotations

from typing import Iterable

from reward_engine.constants import KEY_CATEGORY, KEY_MERCHANT, KEY_PAYMENT_MODE
from reward_engine.schemas import NormalizedRuleConfig


class RuleIndex:
    """Immutable deterministic index for reward rules.
    
    Categorizes rules into buckets for fast candidate lookup, replacing
    linear scans with O(1) subset retrieval.
    """

    def __init__(self, rules: Iterable[NormalizedRuleConfig]) -> None:
        self._by_merchant: dict[str, list[NormalizedRuleConfig]] = {}
        self._by_category: dict[str, list[NormalizedRuleConfig]] = {}
        self._by_payment_mode: dict[str, list[NormalizedRuleConfig]] = {}
        self._fallback: list[NormalizedRuleConfig] = []

        # Total count for instrumentation
        self.total_rules = 0

        for rule in rules:
            self.total_rules += 1
            cfg = rule.config
            merchant = cfg.get(KEY_MERCHANT)
            category = cfg.get(KEY_CATEGORY)
            payment_mode = cfg.get(KEY_PAYMENT_MODE, "any")

            if merchant is not None:
                m_key = merchant.strip().lower()
                if m_key not in self._by_merchant:
                    self._by_merchant[m_key] = []
                self._by_merchant[m_key].append(rule)
            elif category is not None:
                c_key = category.strip().lower()
                if c_key not in self._by_category:
                    self._by_category[c_key] = []
                self._by_category[c_key].append(rule)
            elif payment_mode != "any":
                p_key = payment_mode.strip().lower()
                if p_key not in self._by_payment_mode:
                    self._by_payment_mode[p_key] = []
                self._by_payment_mode[p_key].append(rule)
            else:
                self._fallback.append(rule)

    @property
    def total_count(self) -> int:
        return self.total_rules

    def get_merchant_rules(self, merchant: str) -> list[NormalizedRuleConfig]:
        return self._by_merchant.get(merchant.lower(), [])

    def get_category_rules(self, category: str) -> list[NormalizedRuleConfig]:
        return self._by_category.get(category.lower(), [])

    def get_payment_mode_rules(self, payment_mode: str) -> list[NormalizedRuleConfig]:
        return self._by_payment_mode.get(payment_mode.lower(), [])

    def get_fallback_rules(self) -> list[NormalizedRuleConfig]:
        return self._fallback
