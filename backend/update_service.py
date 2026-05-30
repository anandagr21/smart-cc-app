import os

source_file = "/app/card_intelligence/service.py"

with open(source_file, "r") as f:
    content = f.read()

start_idx = content.find("    async def publish_preview(")

if start_idx != -1:
    new_content = content[:start_idx] + """    async def publish_preview(self, card_id: UUID) -> dict:
        from .models import CardExtractionCandidate, CandidateStatus, CandidateType
        stmt = select(CardExtractionCandidate).where(
            CardExtractionCandidate.card_id == card_id,
            CardExtractionCandidate.status == CandidateStatus.APPROVED
        )
        result = await self.db.execute(stmt)
        approved_candidates = result.scalars().all()
        
        preview = {
            "reward_rules_added": 0,
            "reward_rules_updated": 0,
            "reward_rules_removed": 0,
            "benefits_added": 0,
            "fees_updated": 0,
            "total_candidates": len(approved_candidates)
        }
        
        for c in approved_candidates:
            if c.candidate_type == CandidateType.REWARD_RULE:
                if getattr(c, "change_type", "ADD") == "ADD":
                    preview["reward_rules_added"] += 1
                elif getattr(c, "change_type", "ADD") == "UPDATE":
                    preview["reward_rules_updated"] += 1
                elif getattr(c, "change_type", "ADD") == "STALE":
                    preview["reward_rules_removed"] += 1
            elif c.candidate_type == CandidateType.BENEFIT:
                preview["benefits_added"] += 1
            elif c.candidate_type == CandidateType.FEE_RULE:
                preview["fees_updated"] += 1
                
        return preview
        
    async def publish_candidates(self, card_id: UUID, user_id: UUID) -> dict:
        from .models import CardExtractionCandidate, CandidateStatus, CardIntelligenceVersion, CandidateType
        from models.card_catalog import CardCatalog
        from rewards.models import RewardRule
        stmt = select(CardExtractionCandidate).where(
            CardExtractionCandidate.card_id == card_id,
            CardExtractionCandidate.status == CandidateStatus.APPROVED
        )
        result = await self.db.execute(stmt)
        approved_candidates = result.scalars().all()
        
        if not approved_candidates:
            raise HTTPException(status_code=400, detail="No approved candidates to publish")
            
        card = await self.db.get(CardCatalog, card_id)
        if not card:
            raise HTTPException(status_code=404, detail="Card catalog entry not found")

        candidate_ids = []
        for c in approved_candidates:
            if c.candidate_type == CandidateType.FEE_RULE:
                if c.field_name == "annual_fee":
                    card.annual_fee = c.proposed_value.get("value", card.annual_fee)
                elif c.field_name == "joining_fee":
                    card.joining_fee = c.proposed_value.get("value", card.joining_fee)
            
            elif c.candidate_type == CandidateType.CARD_FIELD:
                if c.field_name == "fee_waiver_spend_threshold":
                    card.fee_waiver_spend_threshold = c.proposed_value.get("value", card.fee_waiver_spend_threshold)
            
            elif c.candidate_type in (CandidateType.MILESTONE, CandidateType.REWARD_RULE, CandidateType.BENEFIT, CandidateType.EXCLUSION):
                change_type = getattr(c, "change_type", "ADD")
                
                if change_type == "STALE":
                    if getattr(c, "published_rule_id", None):
                        rule = await self.db.get(RewardRule, UUID(c.published_rule_id))
                        if rule:
                            rule.is_active = False
                            self.db.add(rule)
                elif change_type == "UPDATE":
                    if getattr(c, "published_rule_id", None):
                        rule = await self.db.get(RewardRule, UUID(c.published_rule_id))
                        if rule:
                            rule.rule_config = c.proposed_value
                            self.db.add(rule)
                else: # ADD
                    rule_type_map = {
                        CandidateType.MILESTONE: "milestone",
                        CandidateType.REWARD_RULE: "cashback",
                        CandidateType.BENEFIT: "benefit",
                        CandidateType.EXCLUSION: "exclusion",
                    }
                    priority = 50
                    if c.candidate_type == CandidateType.REWARD_RULE:
                        eid = c.entity_identifier or ""
                        if eid.startswith("REWARD_MERCHANT_"): priority = 10
                        elif eid.startswith("REWARD_CATEGORY_"): priority = 20
                        elif eid.startswith("REWARD_PLATFORM_"): priority = 25
                        elif "ONLINE" in eid: priority = 30
                        elif "ALL" in eid or "GENERAL" in eid: priority = 40
                        
                    rule = RewardRule(
                        card_id=str(card_id),
                        rule_name=c.entity_identifier,
                        rule_type=rule_type_map.get(c.candidate_type, "generic_reward"),
                        rule_config=c.proposed_value,
                        priority=priority
                    )
                    self.db.add(rule)
                    await self.db.flush()
                    c.published_rule_id = str(rule.id)

            c.status = CandidateStatus.PUBLISHED
            self.db.add(c)
            candidate_ids.append(str(c.id))
            
        self.db.add(card)
        
        v_stmt = select(CardIntelligenceVersion).where(CardIntelligenceVersion.card_id == card_id).order_by(desc(CardIntelligenceVersion.version))
        v_result = await self.db.execute(v_stmt)
        latest_v = v_result.scalars().first()
        version_num = (latest_v.version + 1) if latest_v else 1
            
        version = CardIntelligenceVersion(
            card_id=card_id,
            version=version_num,
            candidate_ids=candidate_ids,
            published_by=user_id,
            change_summary={"total_published": len(candidate_ids)}
        )
        self.db.add(version)
        await self.db.commit()
        await self.db.refresh(version)
        
        return {
            "version_id": version.id,
            "version": version.version,
            "published_at": version.published_at,
            "change_summary": version.change_summary
        }
"""
    with open(source_file, "w") as f:
        f.write(new_content)
    print("Replaced publish_preview and publish_candidates successfully")
else:
    print("Could not find boundaries")
