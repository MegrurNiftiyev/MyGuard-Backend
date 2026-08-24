export interface RiskSummaryReport {
  totalScanned: number;
  safeCount: number;
  suspiciousCount: number;
  blockedCount: number;
  highRiskPercentage: number;
  topRiskCategories: { category: string; count: number }[];
  monthlyTrends: { month: string; safe: number; threat: number }[];
}
