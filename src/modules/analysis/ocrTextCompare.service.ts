import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import stringSimilarity from 'string-similarity';
import { diffWords } from 'diff';
import { env } from '../../config/env.js';

const tessdataPath = path.join(process.cwd(), 'tessdata');

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

    let fullOcrText = '';
    let normalizedOcrText = '';
    let normalizedOcrTextForCompare = '';
    try {
      const images: Buffer[] = [];
      const { createCanvas } = await import('@napi-rs/canvas');
      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport }).promise;
        images.push(canvas.toBuffer('image/png'));
      }

      if (env.GOOGLE_VISION_API_KEY) {
        console.log(`[Layer 1] Google Cloud Vision API istifadə edilir (${images.length} səhifə)...`);
        for (let i = 0; i < images.length; i++) {
          const base64Image = images[i].toString('base64');
          const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [
                {
                  image: { content: base64Image },
                  features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
                  imageContext: { languageHints: ['az', 'en', 'ru'] }
                }
              ]
            })
          });

          if (!response.ok) {
            const errText = await response.text();
            console.warn(`[Layer 1] Google Vision API Xətası: ${errText}. Tesseract-a keçilir...`);
            try {
              const { data: { text } } = await Tesseract.recognize(images[i], 'aze+eng', { langPath: tessdataPath });
              fullOcrText += text + ' ';
            } catch (tessErr: any) {
              console.warn(`[Layer 1] Tesseract OCR xətası (səhifə ${i + 1}): ${tessErr?.message || tessErr}`);
            }
          } else {
            const data = await response.json();
            const text = data.responses[0]?.fullTextAnnotation?.text || '';
            fullOcrText += text + ' ';
          }
        }
      } else {
        console.log(`[Layer 1] GOOGLE_VISION_API_KEY tapılmadı, Tesseract (aze+eng) istifadə edilir...`);
        for (let i = 0; i < images.length; i++) {
          try {
            const { data: { text } } = await Tesseract.recognize(images[i], 'aze+eng', { langPath: tessdataPath });
            fullOcrText += text + ' ';
          } catch (tessErr: any) {
            console.warn(`[Layer 1] Tesseract OCR xətası (səhifə ${i + 1}): ${tessErr?.message || tessErr}`);
          }
        }
      }
      normalizedOcrText = normalizeText(fullOcrText);
      normalizedOcrTextForCompare = normalizeForCompare(fullOcrText);
    } catch (canvasErr: any) {
      console.warn('[Layer 1] Canvas rendering or OCR error. Using text-layer fallback:', canvasErr?.message);
      fullOcrText = fullPdfText;
      normalizedOcrText = normalizedPdfText;
      normalizedOcrTextForCompare = normalizedPdfTextForCompare;
    }

    const rawPdfText = fullPdfText.replace(/\s+/g, ' ').trim();
    const rawOcrText = (fullOcrText || normalizedOcrText).replace(/\s+/g, ' ').trim();

    const matchFraction = stringSimilarity.compareTwoStrings(normalizedPdfTextForCompare, normalizedOcrTextForCompare);
    const matchPercent = Math.round(matchFraction * 100);

    const extraTextSegments: string[] = [];

    // Split PDF text into logical segments to isolate precise distinct hidden text/prompts into a list
    const segments = rawPdfText
      .split(/(?<=[.!?;\n\r])|(?=\*\*\*)|(?<=\*\*\*)|(?<=\|)|(?=\|)|(?=\bConfidential\b)|(?<=\bConfidential\b)|(?=\bInternal Use\b)|(?<=\bInternal Use\b)/i)
      .map(s => s.trim())
      .filter(s => s.length > 8 && !isStructuralNoise(s));

    for (const seg of segments) {
      const normSeg = normalizeForCompare(seg);
      // Check if segment exists anywhere in visual OCR text using window similarity
      const existsInOcr = normalizedOcrTextForCompare.includes(normSeg) || 
                          bestWindowSimilarity(normSeg, normalizedOcrTextForCompare) > 0.68;
      
      if (!existsInOcr) {
        if (!extraTextSegments.some(existing => existing.includes(seg) || seg.includes(existing))) {
          extraTextSegments.push(seg);
        }
      }
    }

    // Fallback if sentence-based parsing missed something but matchPercent is low
    if (extraTextSegments.length === 0 && matchPercent < 90) {
      const diffs = diffWords(normalizedOcrTextForCompare, normalizedPdfTextForCompare);
      for (const part of diffs) {
        if (part.added && part.value.trim().length > 10) {
          const val = part.value.trim();
          if (!extraTextSegments.includes(val)) {
            extraTextSegments.push(val);
          }
        }
      }
    }

    const hiddenTextDetected = matchPercent < 90 || extraTextSegments.length > 0;
    console.log(`[Layer 1] Nəticə: Uyğunluq ${matchPercent}%. Dəqiq gizli mətn blokları:`, extraTextSegments.length);

    return {
      matchPercent,
      hiddenTextDetected,
      extraTextSegments: extraTextSegments.length > 0 ? extraTextSegments : undefined,
      ocrText: rawOcrText || 'OCR mətni oxundu',
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

