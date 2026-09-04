/**
 * Centralized Risk Scoring Configuration & Threshold Constants
 * 
 * Every numeric constant used across Layer 1, Layer 2, Layer 3, and score aggregation
 * is centralized here with traceable rationale and zero duplicate inline literals.
 */
export const RISK_SCORING = {
  // Layer 1 score parameters
  hiddenTextFloorBase: 75,
  hiddenTextFloorPerSegment: 5,
  hiddenTextFloorCap: 20,

  // Layer 2 ML score parameters
  l2InjectionMultiplier: 100,
  l2SuspiciousMultiplier: 70,
  l2SafeResidualCap: 20,

  // Layer 3 LLM score parameters
  l3DefaultConfidence: 0.5, // Neutral baseline when confidence is omitted/unspecified
  l3MaliciousMultiplier: 100,
  l3SafeResidualCap: 20,

  // Factor Weight Distributions
  weightsStandard: { l1: 0.30, l2: 0.35, l3: 0.35 },
  weightsConfidential: { l1: 0.5, l2: 0.5 },
  weightsL2Offline: { l1: 0.4, l3: 0.6 },

  // Threat Floor Overrides & Threshold Cutoffs
  threatFloorMatchPctCutoff: 90, // Re-derived from empirical matchPercent bounds
  threatFloorScore: 85, // Minimum risk score floor on active threat detection

  // Status Bucket Cutoffs
  statusHighRiskCutoff: 80,
  statusSuspiciousCutoff: 35,

  // Reporting Thresholds
  llmReviewUsedCutoff: 60,
} as const;
