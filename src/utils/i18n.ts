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
    ml_unavailable_message: 'Analiz natamamdır (ML servisi əlçatmazdır)',

    // Layer 3 Recommendations
    rec_block: 'Sənədin daxili AI modellərinə ötürülməsi BLOKLANMALIDIR. Təmizlənmiş versiyanı istifadə edin.',
    rec_review: 'Sənəd şübhəlidir. İstifadəçi tərəfindən manual təsdiqlənməyə ehtiyac var.',
    rec_allow: 'Sənəd təhlükəsizdir. İcra oluna bilər.',

    // Confidential Mode
    confidential_mode_message: 'Sənəd Confidential (Məxfi) rejimdə yoxlanıldığı üçün LLM (Süni İntellekt) analizi aparılmadı. Yalnız lokal qatlarda (Layer 1 və Layer 2) təhlil olundu.',
    confidential_mode_reason: 'Confidential Mode: LLM (Süni İntellekt) mərhələsi ötürüldü.',

    // General Errors
    doc_not_found: 'Sənəd tapılmadı',
    unauthorized: 'Avtorizasiya xətası. Etibarlı Bearer Token tələb olunur.',
    err_no_file: 'Fayl tapılmadı (No file provided)',
    err_conversion: 'Sənəd oxuna bilmədiyi üçün (konversiya xətası) süni intellekt analizi aparılmadı.',
    err_conversion_rec: 'Zəhmət olmasa sənədi PDF formatında yenidən yükləyin.',
    // Controller Messages
    no_data: 'Məlumat yoxdur',
    doc_deleted_success: 'Sənəd uğurla silindi',
    injection_cleaned_success: 'Sənəddəki prompt injection təhdidləri təmizləndi.',
    err_isContainInjection_param: 'isContainInjection parametri mütləq və boolean tipində olmalıdır',
    status_updated_success: 'Sənədin statusu istifadəçi tərəfindən uğurla yeniləndi.',
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
    ml_unavailable_message: 'Analysis incomplete (ML service unavailable)',

    // Layer 3 Recommendations
    rec_block: 'BLOCK TRANSFER to corporate AI models. Use sanitized version.',
    rec_review: 'Document is suspicious. Requires manual user review.',
    rec_allow: 'Document is safe. Execution allowed.',

    // Confidential Mode
    confidential_mode_message: 'Because the document was scanned in Confidential Mode, LLM (AI) analysis was bypassed. Analyzed only on local layers (Layer 1 and Layer 2).',
    confidential_mode_reason: 'Confidential Mode: LLM step bypassed.',

    // General Errors
    doc_not_found: 'Document not found',
    unauthorized: 'Unauthorized access. Valid Bearer Token required.',
    err_no_file: 'No file provided',
    err_conversion: 'AI analysis could not be performed due to document unreadability (conversion error).',
    err_conversion_rec: 'Please upload the document again in PDF format.',
    
    // Controller Messages
    no_data: 'No data',
    doc_deleted_success: 'Document deleted successfully',
    injection_cleaned_success: 'Prompt injection threats in the document have been cleaned.',
    err_isContainInjection_param: 'isContainInjection parameter is required and must be a boolean',
    status_updated_success: 'Document status updated successfully by the user.',
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
    ml_unavailable_message: 'Анализ неполный (сервис ML недоступен)',

    // Layer 3 Recommendations
    rec_block: 'БЛОКИРОВАТЬ передачу в ИИ модели. Используйте очищенную версию.',
    rec_review: 'Документ подозрителен. Требуется ручное подтверждение.',
    rec_allow: 'Документ безопасен. Разрешено к исполнению.',

    // Confidential Mode
    confidential_mode_message: 'Поскольку документ сканировался в Конфиденциальном режиме, анализ LLM (ИИ) не проводился. Анализ выполнен только на локальных уровнях (Layer 1 и Layer 2).',
    confidential_mode_reason: 'Confidential Mode: Этап LLM пропущен.',

    // General Errors
    doc_not_found: 'Документ не найден',
    unauthorized: 'Ошибка авторизации. Требуется валидный Bearer Token.',
    err_no_file: 'Файл не предоставлен',
    err_conversion: 'Анализ ИИ не проводился, так как документ не может быть прочитан (ошибка конвертации).',
    err_conversion_rec: 'Пожалуйста, загрузите документ повторно в формате PDF.',
    
    // Controller Messages
    no_data: 'Нет данных',
    doc_deleted_success: 'Документ успешно удален',
    injection_cleaned_success: 'Угрозы внедрения промптов в документе устранены.',
    err_isContainInjection_param: 'Параметр isContainInjection обязателен и должен быть логическим',
    status_updated_success: 'Статус документа успешно обновлен пользователем.',
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
    ml_unavailable_message: 'Analiz tamamlanamadı (ML servisi erişilemez)',

    // Layer 3 Recommendations
    rec_block: 'Kurumsal yapay zeka modellerine aktarımı ENGELLEYİN. Temizlenmiş sürümü kullanın.',
    rec_review: 'Belge şüpheli. Kullanıcı tarafından manuel onay gerekiyor.',
    rec_allow: 'Belge güvenli. İşleme izin veriliyor.',

    // Confidential Mode
    confidential_mode_message: 'Belge Gizli (Confidential) modda tarandığı için LLM (Yapay Zeka) analizi yapılmadı. Yalnızca yerel katmanlarda (Layer 1 ve Layer 2) analiz edildi.',
    confidential_mode_reason: 'Confidential Mode: LLM (Yapay Zeka) aşaması atlandı.',

    // General Errors
    doc_not_found: 'Belge bulunamadı',
    unauthorized: 'Yetkilendirme hatası. Geçerli Bearer Token gerekiyor.',
    err_no_file: 'Dosya bulunamadı',
    err_conversion: 'Belge okunamadığı için (dönüşüm hatası) yapay zeka analizi yapılamadı.',
    err_conversion_rec: 'Lütfen belgeyi PDF formatında tekrar yükleyin.',
    
    // Controller Messages
    no_data: 'Veri yok',
    doc_deleted_success: 'Belge başarıyla silindi',
    injection_cleaned_success: 'Belgedeki prompt injection tehditleri temizlendi.',
    err_isContainInjection_param: 'isContainInjection parametresi zorunludur ve boolean olmalıdır',
    status_updated_success: 'Belge durumu kullanıcı tarafından başarıyla güncellendi.',
  },
};

export function translate(key: string, lang: SupportedLanguage = 'az'): string {
  const dict = translations[lang] || translations.az;
  return dict[key] || translations.az[key] || key;
}
