import { RiskReportMetrics } from './reports.schema.js';

export async function getRiskSummaryReport(userId: string): Promise<RiskReportMetrics> {
  return {
    totalScanned: 1420,
    safeCount: 1180,
    suspiciousCount: 175,
    blockedCount: 65,
    detectedInjectionsCount: 84,
    riskTrend: [
      { date: 'B.e', safe: 180, suspicious: 25, blocked: 8 },
      { date: 'Ç.ə', safe: 210, suspicious: 30, blocked: 12 },
      { date: 'Çər', safe: 195, suspicious: 20, blocked: 5 },
      { date: 'C.ə', safe: 230, suspicious: 35, blocked: 15 },
      { date: 'Cüm', safe: 205, suspicious: 28, blocked: 10 },
      { date: 'Şən', safe: 90, suspicious: 12, blocked: 3 },
      { date: 'Bazar', safe: 70, suspicious: 25, blocked: 12 },
    ],
    injectionTypes: [
      { type: 'Hidden Text (Zero Opacity)', count: 38, percentage: 45 },
      { type: 'Instruction Override', count: 26, percentage: 31 },
      { type: 'Ranking Manipulation', count: 12, percentage: 14 },
      { type: 'External Action Request', count: 8, percentage: 10 },
    ],
    departmentRisks: [
      { department: 'HR Screening', scanned: 540, riskRate: 14 },
      { department: 'Müqavilələr və Tender', scanned: 380, riskRate: 22 },
      { department: 'Maliyyə', scanned: 310, riskRate: 6 },
      { department: 'Müdafiə və Strateji', scanned: 190, riskRate: 35 },
    ],
  };
}
