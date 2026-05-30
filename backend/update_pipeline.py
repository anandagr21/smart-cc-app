import os

source_file = "/app/card_intelligence/extraction/pipeline.py"

with open(source_file, "r") as f:
    content = f.read()

start_idx = content.find("    def _generate_candidates(")

if start_idx != -1:
    new_content = content[:start_idx] + """    def _generate_candidates(
        self, 
        ext, 
        source,
        target_card,
        existing_rules
    ):
        from card_intelligence.models import CardExtractionCandidate, CandidateType
        candidates = []
        
        def generate_diff(candidate_type, entity_identifier, field_name, proposed_value, source_page, source_text, confidence):
            current_value = None
            published_rule_id = None
            
            if candidate_type == CandidateType.FEE_RULE:
                if field_name == "annual_fee":
                    current_value = {"value": target_card.annual_fee} if getattr(target_card, "annual_fee", None) is not None else None
                elif field_name == "joining_fee":
                    current_value = {"value": target_card.joining_fee} if getattr(target_card, "joining_fee", None) is not None else None
            elif candidate_type == CandidateType.CARD_FIELD:
                if field_name == "fee_waiver_spend_threshold":
                    current_value = {"value": target_card.fee_waiver_spend_threshold} if getattr(target_card, "fee_waiver_spend_threshold", None) is not None else None
            else:
                for r in existing_rules:
                    if getattr(r, "rule_name", None) == entity_identifier:
                        current_value = r.rule_config
                        published_rule_id = str(r.id)
                        break
            
            if current_value == proposed_value:
                return None
                
            change_type = "UPDATE" if current_value is not None else "ADD"
            
            return CardExtractionCandidate(
                card_id=source.card_id,
                candidate_type=candidate_type,
                entity_identifier=entity_identifier,
                field_name=field_name,
                current_value=current_value,
                proposed_value=proposed_value,
                change_type=change_type,
                published_rule_id=published_rule_id,
                source_id=source.id,
                source_page=source_page,
                source_text=source_text,
                confidence_score=confidence
            )

        extracted_entities = set()

        if getattr(ext, "annual_fee", None):
            c = generate_diff(CandidateType.FEE_RULE, "ANNUAL_FEE", "annual_fee", {"value": ext.annual_fee.amount}, ext.annual_fee.page, ext.annual_fee.source_chunk, 0.95)
            if c: candidates.append(c)
            
        if getattr(ext, "joining_fee", None):
            c = generate_diff(CandidateType.FEE_RULE, "JOINING_FEE", "joining_fee", {"value": ext.joining_fee.amount}, ext.joining_fee.page, ext.joining_fee.source_chunk, 0.95)
            if c: candidates.append(c)
            
        if getattr(ext, "fee_waiver", None):
            c = generate_diff(CandidateType.CARD_FIELD, "FEE_WAIVER", "fee_waiver_spend_threshold", {"value": ext.fee_waiver.spend_threshold}, ext.fee_waiver.page, ext.fee_waiver.source_chunk, 0.95)
            if c: candidates.append(c)

        for r in getattr(ext, "reward_rules", []):
            base_config = {"reward_type": "cashback", "reward_rate": r.rate}
            if getattr(r, "category", None):
                base_config["category"] = r.category.lower().strip()
            if getattr(r, "cap", None) is not None:
                base_config["max_reward"] = r.cap
                
            merchants = getattr(r, "merchants", [])
            if merchants:
                for merchant_name in merchants:
                    rule_config = base_config.copy()
                    m_name = merchant_name.lower().strip()
                    rule_config["merchant"] = m_name
                    entity_identifier = f"REWARD_MERCHANT_{m_name.upper().replace(' ', '_')}"
                    extracted_entities.add(entity_identifier)
                    
                    c = generate_diff(CandidateType.REWARD_RULE, entity_identifier, "reward_rule", rule_config, getattr(r, "page", None), getattr(r, "source_chunk", ""), 0.90)
                    if c: candidates.append(c)
            else:
                cat = getattr(r, "category", "GENERAL")
                entity_identifier = f"REWARD_CATEGORY_{cat.upper().replace(' ', '_')}"
                extracted_entities.add(entity_identifier)
                c = generate_diff(CandidateType.REWARD_RULE, entity_identifier, "reward_rule", base_config, getattr(r, "page", None), getattr(r, "source_chunk", ""), 0.90)
                if c: candidates.append(c)

        for e in getattr(ext, "exclusions", []):
            entity_identifier = f"EXCLUSION_{e.category.upper().replace(' ', '_')}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.EXCLUSION, entity_identifier, "exclusion", {"category": e.category}, getattr(e, "page", None), getattr(e, "source_chunk", ""), 0.90)
            if c: candidates.append(c)

        for b in getattr(ext, "benefits", []):
            entity_identifier = f"BENEFIT_{b.benefit_type.upper().replace(' ', '_')}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.BENEFIT, entity_identifier, "benefit", {"description": b.description, "uses_per_year": getattr(b, "uses_per_year", None)}, getattr(b, "page", None), getattr(b, "source_chunk", ""), 0.85)
            if c: candidates.append(c)

        for m in getattr(ext, "milestones", []):
            entity_identifier = f"MILESTONE_{int(m.spend_threshold)}"
            extracted_entities.add(entity_identifier)
            c = generate_diff(CandidateType.MILESTONE, entity_identifier, "milestone", {"spend_threshold": m.spend_threshold, "reward_description": m.reward_description}, getattr(m, "page", None), getattr(m, "source_chunk", ""), 0.85)
            if c: candidates.append(c)

        for r in existing_rules:
            if getattr(r, "rule_name", None) not in extracted_entities:
                type_map = {
                    "cashback": CandidateType.REWARD_RULE,
                    "exclusion": CandidateType.EXCLUSION,
                    "benefit": CandidateType.BENEFIT,
                    "milestone": CandidateType.MILESTONE
                }
                c_type = type_map.get(getattr(r, "rule_type", ""), CandidateType.REWARD_RULE)
                
                candidates.append(CardExtractionCandidate(
                    card_id=source.card_id,
                    candidate_type=c_type,
                    entity_identifier=getattr(r, "rule_name", "UNKNOWN"),
                    field_name=c_type.value.lower(),
                    current_value=getattr(r, "rule_config", {}),
                    proposed_value={},
                    change_type="STALE",
                    published_rule_id=str(r.id),
                    source_id=source.id,
                    source_text="Rule present in database but not found in latest extraction.",
                    confidence_score=1.0
                ))
            
        return candidates
"""
    with open(source_file, "w") as f:
        f.write(new_content)
    print("Replaced _generate_candidates successfully")
else:
    print("Could not find boundaries")
