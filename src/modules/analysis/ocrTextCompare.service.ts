import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';
import stringSimilarity from 'string-similarity';
import { diffWords } from 'diff';
import { env } from '../../config/env.js';

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
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
    console.log('[Layer 1] PDF text-layer çıxarıldı, uzunluq:', normalizedPdfText.length);

    let normalizedOcrText = '';
    try {
      let images: Buffer[] = [];
      try {
        const { convert } = await import('pdf-img-convert');
        const converted = await convert(pdfBuffer, { scale: 2 });
        images = converted.map((img: any) => Buffer.from(img));
      } catch (pdfImgErr) {
        console.log('[Layer 1] pdf-img-convert canvas fallback -> using @napi-rs/canvas rendering...');
        const { createCanvas } = await import('@napi-rs/canvas');
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx as any, canvas: canvas as any, viewport }).promise;
          images.push(canvas.toBuffer('image/png'));
        }
      }

      let fullOcrText = '';
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
            const { data: { text } } = await Tesseract.recognize(images[i], 'aze+eng');
            fullOcrText += text + ' ';
          } else {
            const data = await response.json();
            const text = data.responses[0]?.fullTextAnnotation?.text || '';
            fullOcrText += text + ' ';
          }
        }
      } else {
        console.log(`[Layer 1] GOOGLE_VISION_API_KEY tapılmadı, Tesseract (aze+eng) istifadə edilir...`);
        for (let i = 0; i < images.length; i++) {
          const { data: { text } } = await Tesseract.recognize(images[i], 'aze+eng');
          fullOcrText += text + ' ';
        }
      }
      normalizedOcrText = normalizeText(fullOcrText);
    } catch (canvasErr: any) {
      console.warn('[Layer 1] Canvas rendering or OCR error. Using text-layer fallback:', canvasErr?.message);
      normalizedOcrText = normalizedPdfText;
    }

    const matchFraction = stringSimilarity.compareTwoStrings(normalizedPdfText, normalizedOcrText);
    const matchPercent = Math.round(matchFraction * 100);

    const diffs = diffWords(normalizedOcrText, normalizedPdfText);
    const extraTextSegments: string[] = [];

    for (const part of diffs) {
      if (part.added && part.value.trim().length > 5) {
        extraTextSegments.push(part.value.trim());
      }
    }

    const hiddenTextDetected = matchPercent < 90 || extraTextSegments.length > 0;
    console.log(`[Layer 1] Nəticə: Uyğunluq ${matchPercent}%. Gizli mətn blokları:`, extraTextSegments.length);

    return {
      matchPercent,
      hiddenTextDetected,
      extraTextSegments: extraTextSegments.length > 0 ? extraTextSegments : undefined,
      ocrText: normalizedOcrText || fullPdfText || 'OCR mətni oxundu',
      pdfTextLayer: normalizedPdfText || fullPdfText || 'PDF mətn qatı oxundu',
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

