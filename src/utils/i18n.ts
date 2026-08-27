export type SupportedLanguage = 'az' | 'en' | 'ru' | 'tr';

export function parseLanguage(langHeader?: string | string[]): SupportedLanguage {
  if (!langHeader) return 'az';
  const str = Array.isArray(langHeader) ? langHeader[0] : langHeader;
  const normalized = str.toLowerCase().trim();

  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('tr')) return 'tr';
  return 'az';
}

export const translations: Record<SupportedLanguage, Record<string, string>> = {
  az: {
    // Step Messages
    DOCUMENT_UPLOADED: 'Fayl təhlükəsiz sandbox mühitinə daxil oldu',
    PDF_TEXT_EXTRACTION: 'Daxili mətn qatı və strukturu oxundu',
    OCR_ANALYSIS: 'Vizual görüntüdən insan tərəfindən görünən mətn çıxarıldı',
    TEXT_COMPARISON: 'OCR və PDF mətn qatları arasında fərqlər analiz edildi',
    HIDDEN_TEXT_DETECTION: 'Görünməyən şrift ölçüləri, 0% opacity yoxlanıldı',
    PROMPT_INJECTION_ANALYSIS: 'ML/AI detector tərəfindən override cəhdləri yoxlanıldı',
    RISK_ASSESSMENT: 'Risk balı hesablandı və sənəd müvafiq statusa keçirildi',

    // Layer 1 & 2 Messages
    ocr_diff_detected: 'OCR və PDF daxili mətn qatı arasında kiçik fərqlilik aşkar edildi.',
    ml_injection_detected: 'ML classifier tərəfindən mətn daxilində instruction override cəhdi aşkar edildi.',
    ml_safe_message: 'ML classifier tərəfindən sənəd hərtərəfli təhlil edildi, hər hansı prompt injection aşkar edilmədi.',

    // Layer 3 Recommendations
    rec_block: 'Sənədin daxili AI modellərinə ötürülməsi BLOKLANMALIDIR. Təmizlənmiş versiyanı istifadə edin.',
    rec_review: 'Sənəd şübhəlidir. İstifadəçi tərəfindən manual təsdiqlənməyə ehtiyac var.',
    rec_allow: 'Sənəd təhlükəsizdir. İcra oluna bilər.',

    // General Errors
    doc_not_found: 'Sənəd tapılmadı',
    unauthorized: 'Avtorizasiya xətası. Etibarlı Bearer Token tələb olunur.',
  },
  en: {
    // Step Messages
    DOCUMENT_UPLOADED: 'File entered secure sandbox environment',
    PDF_TEXT_EXTRACTION: 'Extracted internal text layer and document structure',
    OCR_ANALYSIS: 'Extracted human-visible text via OCR visual scan',
    TEXT_COMPARISON: 'Compared text layers between OCR and raw PDF font data',
    HIDDEN_TEXT_DETECTION: 'Scanned for zero-width fonts and 0% opacity layers',
    PROMPT_INJECTION_ANALYSIS: 'Evaluated text for instruction override attempts via ML detector',
    RISK_ASSESSMENT: 'Calculated final risk score and assigned safety status',

    // Layer 1 & 2 Messages
    ocr_diff_detected: 'Minor text mismatch detected between OCR and internal PDF text layer.',
    ml_injection_detected: 'ML classifier detected an instruction override attempt in document text.',
    ml_safe_message: 'ML classifier thoroughly analyzed the document. No prompt injection found.',

    // Layer 3 Recommendations
    rec_block: 'BLOCK TRANSFER to corporate AI models. Use sanitized version.',
    rec_review: 'Document is suspicious. Requires manual user review.',
    rec_allow: 'Document is safe. Execution allowed.',

    // General Errors
    doc_not_found: 'Document not found',
    unauthorized: 'Unauthorized access. Valid Bearer Token required.',
  },
  ru: {
    // Step Messages
    DOCUMENT_UPLOADED: 'Файл помещен в защищенную песочницу',
    PDF_TEXT_EXTRACTION: 'Извлечен внутренний текстовый слой и структура документа',
    OCR_ANALYSIS: 'Распознан видимый текст с помощью визуального OCR сканирования',
    TEXT_COMPARISON: 'Сравнены текстовые слои между OCR и исходным кодом PDF',
    HIDDEN_TEXT_DETECTION: 'Проведено сканирование на наличие скрытого текста и 0% прозрачности',
    PROMPT_INJECTION_ANALYSIS: 'Проведена проверка на инъекции промптов через ML детектор',
    RISK_ASSESSMENT: 'Рассчитан итоговый балл риска и присвоен статус безопасности',

    // Layer 1 & 2 Messages
    ocr_diff_detected: 'Обнаружено расхождение между OCR и внутренним слоем текста PDF.',
    ml_injection_detected: 'ML классификатор обнаружил попытку обхода инструкций (Instruction Override).',
    ml_safe_message: 'ML классификатор проверил документ. Инъекций промптов не обнаружено.',

    // Layer 3 Recommendations
    rec_block: 'БЛОКИРОВАТЬ передачу в ИИ модели. Используйте очищенную версию.',
    rec_review: 'Документ подозрителен. Требуется ручное подтверждение.',
    rec_allow: 'Документ безопасен. Разрешено к исполнению.',

    // General Errors
    doc_not_found: 'Документ не найден',
    unauthorized: 'Ошибка авторизации. Требуется валидный Bearer Token.',
  },
  tr: {
    // Step Messages
    DOCUMENT_UPLOADED: 'Dosya güvenli korumalı alana (sandbox) eklendi',
    PDF_TEXT_EXTRACTION: 'İç metin katmanı ve belge yapısı okundu',
    OCR_ANALYSIS: 'Görsel tarama ile insan tarafından görülebilen metin çıkarıldı',
    TEXT_COMPARISON: 'OCR ve PDF iç metin katmanları arasındaki farklar analiz edildi',
    HIDDEN_TEXT_DETECTION: 'Gizli font boyutları ve %0 opaklık katmanları tarandı',
    PROMPT_INJECTION_ANALYSIS: 'ML dedektörü ile talimat geçersiz kılma denemeleri incelendi',
    RISK_ASSESSMENT: 'Nihai risk puanı hesaplandı ve güvenlik durumu atandı',

    // Layer 1 & 2 Messages
    ocr_diff_detected: 'OCR ve PDF iç metin katmanı arasında küçük farklılık tespit edildi.',
    ml_injection_detected: 'ML sınıflandırıcı tarafından metin içinde talimat geçersiz kılma denemesi saptandı.',
    ml_safe_message: 'ML sınıflandırıcı belgeyi analiz etti. Herhangi bir prompt injection bulunamadı.',

    // Layer 3 Recommendations
    rec_block: 'Kurumsal yapay zeka modellerine aktarımı ENGELLEYİN. Temizlenmiş sürümü kullanın.',
    rec_review: 'Belge şüpheli. Kullanıcı tarafından manuel onay gerekiyor.',
    rec_allow: 'Belge güvenli. İşleme izin veriliyor.',

    // General Errors
    doc_not_found: 'Belge bulunamadı',
    unauthorized: 'Yetkilendirme hatası. Geçerli Bearer Token gerekiyor.',
  },
};

export function translate(key: string, lang: SupportedLanguage = 'az'): string {
  const dict = translations[lang] || translations.az;
  return dict[key] || translations.az[key] || key;
}
