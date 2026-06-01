from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from rewards.models import RewardRule
import logging

logger = logging.getLogger(__name__)

class CardCompletenessError(Exception):
    def __init__(self, message: str, failures: List[str]):
        super().__init__(message)
        self.failures = failures

@dataclass
class AuditResult:
    passed: bool
    failures: List[str]

class CardCompletenessAuditor:
    """
    Acts as a 'pytest' for card intelligence.
    Validates a list of RewardRules before they are published to the DB.
    """
    
    @classmethod
    def audit(cls, card_name: str, rules: List[RewardRule], db_session=None) -> AuditResult:
        failures = []
        
        # 1. At least one fallback rule
        fallback_rules = [r for r in rules if r.priority in (40, 50) and r.rule_name == "ALL_SPENDS"]
        if not fallback_rules:
            failures.append("Missing fallback rule (ALL_SPENDS at priority 40 or 50).")
            
        # 2. At least one reward-producing rule
        reward_producing = [r for r in rules if r.rule_type in ("merchant_bonus", "category_bonus", "reward_points", "cashback")]
        if not reward_producing:
            failures.append("No reward-producing rules found. Cannot only have exclusions/caps.")
            
        # 3. No duplicate merchant rules
        merchant_rules = [r for r in rules if r.rule_type == "merchant_bonus"]
        merchant_names = [r.rule_config.get("merchant", "").lower() for r in merchant_rules if "merchant" in r.rule_config]
        if len(merchant_names) != len(set(merchant_names)):
            duplicates = set([x for x in merchant_names if merchant_names.count(x) > 1])
            failures.append(f"Duplicate merchant rules found for: {', '.join(duplicates)}")
            
        # 4. No conflicting priorities
        # Rules of different types matching the same scope cannot share a priority. 
        # But multiple merchant rules can share priority 10.
        # So we group by (priority, rule_type). If we have multiple rule types with the same priority, that's a conflict.
        priorities = {}
        for r in rules:
            priorities.setdefault(r.priority, set()).add(r.rule_type)
            
        for p, types in priorities.items():
            if len(types) > 1:
                failures.append(f"Conflicting priority {p} assigned to multiple rule types: {', '.join(types)}")
                
        # 5, 6, 7. Rule Math Validations
        for r in rules:
            cfg = r.rule_config or {}
            rt = cfg.get("reward_type", "")
            
            if rt == "cashback":
                rate = cfg.get("reward_rate")
                if rate is None:
                    failures.append(f"Rule '{r.rule_name}' is cashback but missing reward_rate.")
                elif float(rate) > 1.0 or float(rate) <= 0.0:
                    failures.append(f"Rule '{r.rule_name}' has reward_rate > 100% or <= 0% ({rate}).")
                    
            elif rt in ("points", "reward_points"):
                ppu = cfg.get("points_per_unit")
                sd = cfg.get("spend_denominator")
                if not ppu or not sd:
                    failures.append(f"Rule '{r.rule_name}' is points but missing points_per_unit or spend_denominator.")
                elif float(ppu) > 100 or float(ppu) <= 0:
                    failures.append(f"Rule '{r.rule_name}' has points_per_unit > 100 or <= 0 ({ppu}).")
                elif float(sd) <= 0:
                    failures.append(f"Rule '{r.rule_name}' has spend_denominator <= 0 ({sd}).")
                    
                point_value = cfg.get("point_value")
                if point_value is not None:
                    if float(point_value) > 5.0 or float(point_value) <= 0:
                        failures.append(f"Rule '{r.rule_name}' has point_value > 5.0 or <= 0 ({point_value}).")
                    
        # 8. Merchant Alias Coverage (Requires DB Session)
        if db_session:
            for r in merchant_rules:
                merchant_name = r.rule_config.get("merchant", "").lower()
                if merchant_name:
                    from merchants.repository import MerchantRepository
                    from merchants.models import MerchantAlias
                    from sqlmodel import select
                    
                    # Look up merchant by exact name, then check aliases
                    # Since this is async, if db_session is provided, we can't easily await inside a sync method.
                    # We will handle the async alias check externally or require an async audit wrapper.
                    pass
                    
        return AuditResult(passed=len(failures) == 0, failures=failures)
        
    @classmethod
    async def audit_async(cls, card_name: str, rules: List[RewardRule], db_session) -> AuditResult:
        """Async version to check database for aliases."""
        result = cls.audit(card_name, rules)
        failures = result.failures
        
        merchant_rules = [r for r in rules if r.rule_type == "merchant_bonus"]
        if db_session:
            from merchants.models import Merchant, MerchantAlias
            from sqlmodel import select
            
            for r in merchant_rules:
                merchant_name = r.rule_config.get("merchant", "").lower()
                if merchant_name:
                    # Look up the canonical merchant
                    stmt = select(Merchant).where(Merchant.canonical_name.ilike(merchant_name))
                    res = await db_session.execute(stmt)
                    merchant = res.scalars().first()
                    
                    if not merchant:
                        # Maybe it is an alias?
                        astmt = select(MerchantAlias).where(MerchantAlias.normalized_name.ilike(merchant_name))
                        ares = await db_session.execute(astmt)
                        alias = ares.scalars().first()
                        if alias:
                            merchant_id = alias.merchant_id
                        else:
                            failures.append(f"Merchant '{merchant_name}' has no aliases in DB (and does not exist as a canonical merchant).")
                            continue
                    else:
                        merchant_id = merchant.id
                        
                    # Check if there are aliases for this merchant_id
                    astmt2 = select(MerchantAlias).where(MerchantAlias.merchant_id == merchant_id)
                    ares2 = await db_session.execute(astmt2)
                    aliases = ares2.scalars().all()
                    
                    if len(aliases) == 0:
                        failures.append(f"Merchant rule for '{merchant_name}' has no aliases configured in the DB. Add aliases to prevent normalization gaps.")
                        
        return AuditResult(passed=len(failures) == 0, failures=failures)
