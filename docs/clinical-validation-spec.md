# Clinical Validation Spec (Axiom v2)

## Objective
Validate that the v2 clinical-informed risk layer is stable, interpretable, and useful for behavioral risk tracking.

## Non-goals
1. Clinical diagnosis replacement.
2. Emergency triage replacement.
3. Psychiatric treatment recommendation automation.

## Ground truth strategy
Use periodic validated self-report instruments:
1. PHQ-9 (depressive symptom burden)
2. GAD-7 (anxiety symptom burden)
3. PSS (perceived stress)
4. ISI (sleep disturbance)

These should be treated as calibration anchors, not perfect truth labels.

## Validation datasets
1. Retrospective window: last 60-180 days per user.
2. Prospective window: rolling 4-8 weeks.
3. Minimum data quality threshold:
   - at least 30 events in 30 days OR
   - at least 12 mixed signals (events/interactions/transactions) per 7 days.

## Core metrics
1. Calibration:
   - Brier score
   - Reliability curve by risk decile
2. Discrimination:
   - AUROC for high symptom burden thresholds
3. Temporal stability:
   - day-to-day volatility
   - false positive streak length
4. Explainability coverage:
   - percentage of outputs with actionable markers

## Acceptance criteria (initial)
1. Brier score <= 0.20 on validation cohort.
2. AUROC >= 0.70 for high-risk anchor labels.
3. Less than 15% unstable day-to-day flips without signal change.
4. More than 95% outputs include at least one explainable marker or explicit "insufficient data".

## Deployment approach
1. Keep v1 as primary state engine.
2. Run v2 in shadow mode for at least 2 weeks.
3. Compare v1 vs v2 drift and alert precision.
4. Promote v2 only after acceptance criteria are met.

## Suggested schema outputs
Store under `computed_global_state/latest`:
1. `model_version`
2. `clinical_v2.risk_score`
3. `clinical_v2.risk_band`
4. `clinical_v2.confidence`
5. `clinical_v2.data_quality`
6. `clinical_v2.axis_scores`
7. `clinical_v2.markers`
