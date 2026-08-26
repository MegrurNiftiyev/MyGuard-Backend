# Document Model — Persisted Data + Socket Payload Uyğunluğu

Bu, `documents` collection-unun **tam** modelidir. Socket-dən gələn hər addımın nəticəsi elə bu modelin bir hissəsini doldurur — socket "canlı bildiriş" formatı, bu model isə "həqiqətin mənbəyi" (source of truth). İkisi eyni sahə adlarını paylaşmalıdır ki, `GET /api/documents/{id}` (səhifə yenilənəndən sonra) və canlı socket event-i eyni strukturu qaytarsın, frontend-də iki fərqli parse məntiqi yazmayasan.

## Tam Document modeli

```ts
interface Document {
  id: string;
  ownerId: string;                    // user, GET all-da filter üçün

  // ── Fayl məlumatı ──
  fileName: string;
  fileSizeBytes: number;
  fileType: 'pdf' | 'docx' | 'txt';
  uploadUrl: string;                  // faylın özünün saxlandığı yer (storage link)

  // ── Vaxt izləmə (progress göstərmək üçün) ──
  uploadedAt: string;                 // ISO timestamp — fayl backend-ə çatan an
  scanStartedAt: string | null;       // pipeline-ın faktiki başladığı an (uploadedAt-dan bir az sonra ola bilər, əgər queue varsa)
  scanFinishedAt: string | null;      // son addım (RISK_ASSESSMENT) bitəndə dolur
  scanDurationMs: number | null;      // scanFinishedAt - scanStartedAt, hesablanıb saxlanılır ki, hər sorğuda yenidən hesablamaq lazım gəlməsin

  // ── Pipeline vəziyyəti (canlı progress üçün) ──
  currentStep: ScanStep | 'COMPLETED' | 'FAILED';
  stepStatus: 'pending' | 'active' | 'completed' | 'error';
  stepHistory: {                      // hər addımın öz vaxtı — "hansı addım neçə saniyə çəkdi" göstərmək istəsən lazım olacaq
    step: ScanStep;
    startedAt: string;
    finishedAt: string | null;
    status: 'completed' | 'error';
  }[];

  // ── Pipeline nəticələri (socket-dəki fileData ilə EYNİ struktur) ──
  layer1_ocrTextMatch: {
    matchPercent: number;
    hiddenTextDetected: boolean;
    extraTextSegments: string[];
    status: 'clean' | 'suspicious';
  } | null;

  layer2_classification: {
    label: 'safe' | 'suspicious' | 'injection';
    confidence: number;
    categories: string[];
  } | null;

  layer3_llmReview: {
    used: boolean;
    explanation: string | null;
  } | null;

  // ── Yekun nəticə ──
  finalRiskScore: number | null;      // 0-100
  finalStatus: 'safe' | 'suspicious' | 'high_risk' | null;

  // ── Human review (əvvəlki feedback loop üçün) ──
  reviewedByUser: boolean;
  userReviewLabel: boolean | null;    // istifadəçinin "bu injection-dur?" cavabı, əmin olunmayan hallarda

  // ── Xəta halı ──
  errorDetail: string | null;         // hər hansı addım error verərsə
}

type ScanStep =
  | 'DOCUMENT_UPLOADED'
  | 'PDF_TEXT_EXTRACTION'
  | 'OCR_ANALYSIS'
  | 'TEXT_COMPARISON'
  | 'HIDDEN_TEXT_DETECTION'
  | 'PROMPT_INJECTION_ANALYSIS'
  | 'RISK_ASSESSMENT';
```

## Socket event-i bu modeldən necə törəyir

Socket hər dəfə **tam sənəd obyektinin cari vəziyyətini** göndərir (əvvəl razılaşdığımız cumulative snapshot formatı) — yəni socket payload-ı sadəcə bu Document obyektinin bir hissəsidir, ayrıca format deyil:

```ts
interface ScanSocketEvent {
  response: 'success' | 'error';
  step: ScanStep;
  message: string;
  fileData: Pick<Document,
    | 'currentStep' | 'stepStatus'
    | 'layer1_ocrTextMatch' | 'layer2_classification' | 'layer3_llmReview'
    | 'finalRiskScore' | 'finalStatus'
    | 'scanStartedAt' | 'scanFinishedAt' | 'scanDurationMs'
  >;
}
```

Backend implementasiyasında qayda sadədir: hər addım bitəndə əvvəlcə DB-dəki Document sənədini yenilə (yuxarıdakı sahələri doldur), sonra **elə həmin yenilənmiş obyektdən** socket event-i qur — iki ayrı data strukturu əl ilə sinxron saxlamaq riskindən qaçmış olursan.

```ts
async function completeStep(documentId: string, step: ScanStep, patch: Partial<Document>) {
  const updated = await db.collection('documents').findOneAndUpdate(
    { id: documentId },
    { $set: { ...patch, currentStep: step, stepStatus: 'completed',
               $push: { stepHistory: { step, finishedAt: new Date().toISOString(), status: 'completed' } } } },
    { returnDocument: 'after' }
  );

  io.to(`document:${documentId}`).emit('scan_event', {
    response: 'success',
    step,
    message: stepMessages[step],
    fileData: pickSocketFields(updated),
  });
}
```

## Vaxt sahələri niyə lazımdır (progress göstərmək üçün)

- `uploadedAt` → `scanStartedAt`: əgər aralarında fərq varsa (queue-da gözləyib), UI-də "növbədədir" göstərmək mümkün olur.
- `scanStartedAt` (canlı) + hazırkı vaxt: frontend-də "X saniyədir işlənir" sayğacı üçün — bunu backend hesablamır, frontend `scanStartedAt`-i alıb özü interval ilə sayır, backend yalnız başlanğıc nöqtəsini verir.
- `stepHistory[].startedAt/finishedAt`: hər addımın nə qədər çəkdiyini retrospektiv göstərmək üçün (məs. Analysis Result səhifəsində "OCR analizi 2.3 saniyə çəkdi" kimi detal istəsən, buradan gəlir).
- `scanDurationMs`: tam prosesin neçə saniyə çəkdiyi, Documents siyahısında/Risk Reports-da statistika üçün faydalıdır.

## `GET /api/documents` (get-all) cavab forması

Bu endpoint tam `Document` obyektini yox, siyahı üçün yüngülləşdirilmiş versiyanı qaytarmalıdır (əvvəl `mockData`/DTO müzakirəsində razılaşdığımız kimi — list vs detail fərqli DTO):

```ts
interface DocumentListItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  finalStatus: 'safe' | 'suspicious' | 'high_risk' | null;
  finalRiskScore: number | null;
  currentStep: ScanStep | 'COMPLETED' | 'FAILED';   // hələ skan olunmaqda olan sənədləri də göstərmək üçün
}
```

`GET /api/documents/{id}` isə **tam** `Document` obyektini qaytarır (yuxarıdakı ilk model) — bu, həm "əvvəlki sənədə qayıdıb baxmaq", həm də socket-ə qoşulmadan əvvəl "hazırkı vəziyyəti REST-dən çəkmək" üçün istifadə olunur (əvvəl razılaşdığımız reconnect strategiyası).

## Xülasə — heç nə itmir

- Socket yalnız **bildiriş kanalıdır**, öz başına heç nə saxlamır.
- Hər addım DB-yə yazılır **əvvəlcə**, socket event-i **sonra**, elə DB-dən dönən nəticədən qurulur.
- İstifadəçi sənəddən çıxıb sonra qayıtsa, `GET /api/documents/{id}` ilə tam tarixçəni (`stepHistory` daxil) görür — heç bir addım nəticəsi itmir, çünki socket "yaddaş" deyil, DB-nin canlı əks-sədasıdır.
