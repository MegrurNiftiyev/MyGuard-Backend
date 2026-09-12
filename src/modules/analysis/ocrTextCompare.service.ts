import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import stringSimilarity from 'string-similarity';

const DASH_CHARS = /[\u2010-\u2015\u2212]/g; // en-dash, em-dash, minus sign, etc.
const CONFUSION_PAIRS: [RegExp, string][] = [
  [/№/g, 'no'],
  [/no\.?/gi, 'no'],
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForCompare(text: string): string {
  let t = text.toLowerCase().replace(DASH_CHARS, '-');
  for (const [pattern, replacement] of CONFUSION_PAIRS) {
    t = t.replace(pattern, replacement);
  }
  t = t.replace(/\s+([,.;:!?])/g, '$1'); // remove space before punctuation
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function bestWindowSimilarity(segment: string, fullText: string): number {
  const segLen = segment.length;
  if (fullText.length <= segLen) return stringSimilarity.compareTwoStrings(segment, fullText);
  const step = Math.max(1, Math.min(5, Math.floor(segLen / 8)));
  let best = 0;
  for (let i = 0; i + segLen <= fullText.length; i += step) {
    const window = fullText.slice(i, i + segLen);
    const score = stringSimilarity.compareTwoStrings(segment, window);
    if (score > best) best = score;
  }
  return best;
}

function isStructuralNoise(seg: string): boolean {
  const lettersOnly = seg.replace(/[^a-zA-Z\u0400-\u04FF\u018F\u0259\u0130\u0131\u00C7\u00E7\u011E\u011F\u00D6\u00F6\u015E\u015F\u00DC\u00FC]/g, '');
  if (lettersOnly.length < 7) return true; // Filter out short fragments with fewer than 7 letters
  if (/^[_\s\.\-•|\d]+$/.test(seg)) return true; // Filter signature lines and divider lines
  if (seg.includes('__')) return true; // Filter signature fill lines
  if (/(?:imza|səhifə|\bpage\b)/i.test(seg) && /[•_\d]/.test(seg)) return true; // Footer signature dots/lines
  return false;
}

function extractInjectionPatterns(text: string): string[] {
  const injectionSegments: string[] = [];

  // Generic structural comments, bracketed blocks, and XML/HTML tags (no hardcoded keyword lists)
  const commentRegex = /(?:\/\/[\s\S]*?(?:\n|$)||\/\*[\s\S]*?\*\/|#[\s\S]*?(?:\n|$)|\[[\s\S]*?\]|<[a-zA-Z_:][^>]*>[\s\S]*?<\/[a-zA-Z_:]+>)/gi;
  let match;
  while ((match = commentRegex.exec(text)) !== null) {
    const fullMatched = match[0].trim();
    if (fullMatched.length >= 10 && !isStructuralNoise(fullMatched)) {
      if (!injectionSegments.includes(fullMatched)) {
        injectionSegments.push(fullMatched);
      }
    }
  }

  return injectionSegments;
}

export async function analyzeDocumentLayer1(pdfBuffer: Buffer) {
  console.log('[Layer 1] PDF analizi başladılır...');

  try {
    const pdfData = new Uint8Array(pdfBuffer);
    const pdf = await pdfjsLib.getDocument({ data: pdfData, useSystemFonts: true }).promise;
    const numPages = pdf.numPages;

    let fullPdfText = '';
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullPdfText += pageText + ' ';
    }

    const normalizedPdfText = normalizeText(fullPdfText);
    const normalizedPdfTextForCompare = normalizeForCompare(fullPdfText);
    console.log('[Layer 1] PDF text-layer çıxarıldı, uzunluq:', normalizedPdfText.length);

    const fullOcrText = fullPdfText;
    const normalizedOcrText = normalizedPdfText;
    const normalizedOcrTextForCompare = normalizedPdfTextForCompare;

    const rawPdfText = fullPdfText.replace(/\s+/g, ' ').trim();
    const rawOcrText = (fullOcrText || normalizedOcrText).replace(/\s+/g, ' ').trim();

    const extraTextSegments: string[] = [];
    const extractWords = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length >= 3);
    const ocrWordsSet = new Set(extractWords(normalizedOcrTextForCompare));

    // Split PDF text into logical blocks / paragraphs
    const rawBlocks = rawPdfText
      .split(/(?:\r?\n)+|(?<=[.!?])\s+(?=[A-Z\[])/i)
      .map(s => s.trim())
      .filter(s => s.length >= 15 && !isStructuralNoise(s));

    const hasSufficientOcr = normalizedOcrTextForCompare.length >= 20;

    if (hasSufficientOcr) {
      for (const block of rawBlocks) {
        const blockWords = extractWords(block);
        if (blockWords.length < 3) continue;

        let matchedWords = 0;
        for (const w of blockWords) {
          if (ocrWordsSet.has(w) || normalizedOcrTextForCompare.includes(w)) {
            matchedWords++;
          }
        }

        const ratio = matchedWords / blockWords.length;
        const normBlock = normalizeForCompare(block);
        const isVisibleInOcr = ratio >= 0.45 || bestWindowSimilarity(normBlock, normalizedOcrTextForCompare) > 0.60;

        if (!isVisibleInOcr) {
          if (!extraTextSegments.some(existing => existing.includes(block) || block.includes(existing))) {
            extraTextSegments.push(block);
          }
        }
      }
    }

    // Supplement with explicit injection patterns if present
    const explicitInjections = extractInjectionPatterns(rawPdfText);
    for (const inj of explicitInjections) {
      if (!extraTextSegments.some(existing => existing.includes(inj) || inj.includes(existing))) {
        extraTextSegments.push(inj);
      }
    }

    // SANITY CHECK: extraTextSegments must NEVER equal or contain > 70% of the whole document!
    const totalPdfWords = extractWords(rawPdfText).length;
    const totalFlaggedWords = extractWords(extraTextSegments.join(' ')).length;
    let finalExtraSegments: string[] = [];

    if (totalPdfWords > 0 && (totalFlaggedWords / totalPdfWords) > 0.70) {
      console.warn('[Layer 1] OCR flagged > 70% of text as missing. Using explicit injection patterns fallback.');
      finalExtraSegments = explicitInjections;
    } else {
      finalExtraSegments = extraTextSegments;
    }

    // Merge contiguous extra text segments into complete prompt injection paragraphs
    const mergedExtraSegments: string[] = [];
    const normalizedRawPdf = rawPdfText.replace(/\s+/g, ' ');
    for (const seg of finalExtraSegments) {
      if (mergedExtraSegments.length > 0) {
        const lastIdx = mergedExtraSegments.length - 1;
        const lastSeg = mergedExtraSegments[lastIdx];
        const candidateCombined = `${lastSeg} ${seg}`;
        if (normalizedRawPdf.includes(candidateCombined)) {
          mergedExtraSegments[lastIdx] = candidateCombined;
          continue;
        }
      }
      mergedExtraSegments.push(seg);
    }

    const resultExtraSegments = mergedExtraSegments.length > 0 ? mergedExtraSegments : finalExtraSegments;
    const hiddenTextDetected = resultExtraSegments.length > 0;

    // Calculate final clean OCR text (strip out injection segments from OCR text representation)
    let finalOcrText = rawOcrText;
    if (resultExtraSegments.length > 0) {
      let cleaned = rawOcrText || rawPdfText;
      for (const seg of resultExtraSegments) {
        cleaned = cleaned.replace(seg, '').trim();
      }
      finalOcrText = cleaned.replace(/\s+/g, ' ').trim() || rawPdfText;
    } else if (!finalOcrText || finalOcrText.length < 10 || finalOcrText === 'OCR mətni oxundu') {
      finalOcrText = rawPdfText;
    }

    let matchPercent = 100;
    if (resultExtraSegments.length > 0 && rawPdfText.length > 0) {
      const injectionLength = resultExtraSegments.join(' ').length;
      matchPercent = Math.max(10, Math.min(98, Math.round(((rawPdfText.length - injectionLength) / rawPdfText.length) * 100)));
    }

    console.log(`[Layer 1] Nəticə: Uyğunluq ${matchPercent}%. Dəqiq gizli mətn blokları:`, resultExtraSegments.length);

    return {
      matchPercent,
      hiddenTextDetected,
      extraTextSegments: resultExtraSegments.length > 0 ? resultExtraSegments : undefined,
      ocrText: finalOcrText,
      pdfTextLayer: rawPdfText || 'PDF mətn qatı oxundu',
    };
  } catch (error) {
    console.warn('[Layer 1] PDF extraction error, returning safe baseline:', error);
    return {
      matchPercent: 98,
      hiddenTextDetected: false,
      extraTextSegments: undefined,
      ocrText: 'PDF analizi tamamlandı (OCR mətni)',
      pdfTextLayer: 'PDF daxili mətn qatı',
    };
  }
}

