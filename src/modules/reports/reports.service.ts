import { RiskDashboardStats } from './reports.schema.js';
import { getUserFullDocuments } from '../documents/documents.service.js';

export async function getRiskSummaryReport(userId: string): Promise<RiskDashboardStats> {
  const docs = await getUserFullDocuments(userId);

  const totalScanned = docs.length;
  let safeCount = 0;
  let suspiciousCount = 0;
  let blockedCount = 0;
  let detectedInjectionsCount = 0;

  const documentsSummary = docs.map(d => {
    const isInjection = Boolean(d.finalStatus === 'high_risk' || d.finalStatus === 'blocked' || d.layer2_classification?.label === 'injection' || d.layer3_llmReview?.isMalicious === true);
    if (d.finalStatus === 'safe') safeCount++;
    else if (d.finalStatus === 'suspicious') suspiciousCount++;
    else if (d.finalStatus === 'blocked' || d.finalStatus === 'high_risk') blockedCount++;
    else safeCount++;

    if (isInjection) detectedInjectionsCount++;

    return {
      id: d.id,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt || new Date().toISOString(),
      finalStatus: d.finalStatus || 'safe',
      finalRiskScore: d.finalRiskScore ?? 0,
      isContainInjection: isInjection,
    };
  });

  const dayNames = ['Bazar', 'B.e', 'Ç.ə', 'Çər', 'C.ə', 'Cüm', 'Şən'];
  const trendMap: Record<string, { safe: number; suspicious: number; blocked: number }> = {};

  for (const d of docs) {
    const dateObj = new Date(d.uploadedAt || Date.now());
    const dayLabel = dayNames[dateObj.getDay()] || 'B.e';
    if (!trendMap[dayLabel]) {
      trendMap[dayLabel] = { safe: 0, suspicious: 0, blocked: 0 };
    }
    if (d.finalStatus === 'safe') trendMap[dayLabel].safe++;
    else if (d.finalStatus === 'suspicious') trendMap[dayLabel].suspicious++;
    else trendMap[dayLabel].blocked++;
  }

  const riskTrend = Object.entries(trendMap).map(([date, counts]) => ({
    date,
    ...counts
  }));

  if (riskTrend.length === 0) {
    riskTrend.push({ date: 'Bu gün', safe: safeCount, suspicious: suspiciousCount, blocked: blockedCount });
  }

  const catMap: Record<string, number> = {};
  for (const d of docs) {
    const cats = d.layer2_classification?.categories || [];
    for (const c of cats) {
      catMap[c] = (catMap[c] || 0) + 1;
    }
    if (d.layer1_ocrTextMatch?.hiddenTextDetected) {
      catMap['Hidden Text (Zero Opacity)'] = (catMap['Hidden Text (Zero Opacity)'] || 0) + 1;
    }
  }

  const injectionTypes = Object.entries(catMap).map(([type, count]) => ({
    type,
    count,
    percentage: detectedInjectionsCount > 0 ? Math.round((count / detectedInjectionsCount) * 100) : 0
  }));

  return {
    totalScanned,
    safeCount,
    suspiciousCount,
    blockedCount,
    detectedInjectionsCount,
    riskTrend,
    injectionTypes: injectionTypes.length > 0 ? injectionTypes : [{ type: 'Aktiv Injection Tapılmadı', count: 0, percentage: 0 }],
    departmentRisks: [
      { department: 'Sənəd Yoxlamaları', scanned: totalScanned, riskRate: totalScanned > 0 ? Math.round((blockedCount / totalScanned) * 100) : 0 },
    ],
    documentsSummary,
  };
}
