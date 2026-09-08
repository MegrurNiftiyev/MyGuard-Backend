import { ScreenDestination, MessageBlock } from '../../types/index.js';

export interface ScreenNavigationMetadata {
  enum: keyof typeof ScreenDestination | string;
  nameAz: string;
  route: string;
  description: string;
}

export const NAVIGATION_SCREENS: Record<string, ScreenNavigationMetadata> = {
  HOME_SCREEN: {
    enum: 'HOME_SCREEN',
    nameAz: 'Əsas səhifə',
    route: '/home',
    description: 'Sistem ümumi təhlükəsizlik statusu, aktiv risklərin xülasəsi və son skan paneli',
  },
  DOCUMENTS_SCREEN: {
    enum: 'DOCUMENTS_SCREEN',
    nameAz: 'Sənədlər',
    route: '/documents',
    description: 'Yüklənmiş sənədlərin siyahısı, OCR vs PDF müqayisəsi və təmizlənmiş versiya yükləmələri',
  },
  SCAN_SCREEN: {
    enum: 'SCAN_SCREEN',
    nameAz: 'Skan et',
    route: '/scan',
    description: 'Yeni sənəd yükləmək, sənədi 7-addımlı təhlükəsizlik skanından keçirmək',
  },
  AI_SCREEN: {
    enum: 'AI_SCREEN',
    nameAz: 'AI Assistant',
    route: '/ai-assistant',
    description: 'Böyük AI Təhlükəsizlik Əməliyyatları Konsolu (SOC)',
  },
  SETTINGS_SCREEN: {
    enum: 'SETTINGS_SCREEN',
    nameAz: 'Parametrlər',
    route: '/settings',
    description: 'Sistem tənzimləmələri, avto-bloklama hədləri və platform konfiqurasiyası',
  },
};

/**
 * Generates a standardized navigation UI block for AI responses
 */
export function createNavigationBlock(
  targetScreen: string,
  buttonLabel?: string,
  explanationText?: string
): MessageBlock {
  const screenInfo = NAVIGATION_SCREENS[targetScreen] || {
    enum: targetScreen,
    nameAz: targetScreen,
    route: `/${targetScreen.toLowerCase().replace('_screen', '')}`,
    description: 'Tətbiq səhifəsinə keçid',
  };

  return {
    type: 'link',
    label: buttonLabel || `${screenInfo.nameAz} səhifəsinə keç`,
    url: screenInfo.enum,
    content: explanationText || `Bu əməliyyatı icra etmək üçün ${screenInfo.nameAz} səhifəsinə keçin.`,
  };
}

export const AI_NAVIGATION_SYSTEM_PROMPT_INSTRUCTION = `
NAVIGATION & PAGE EXPLANATION RULES:
1. When the user asks "How do I do X?" or asks for instructions (e.g. how to scan documents, change settings, view recent documents, view all documents, open AI console), ALWAYS provide a complete, clear, step-by-step text explanation FIRST inside the response!
2. NEVER force immediate page redirects or substitute step-by-step explanations with just a navigation button. The user expects direct answers in the chat window.
3. Include a "link" navigation block ONLY IF:
   a) The user explicitly asks to navigate to a screen (e.g. "skan səhifəsinə keç", "parametrləri aç").
   b) OR as a helpful optional shortcut link at the end of your step-by-step explanation.
4. Screen Destination Enum values mapping:
   - "HOME_SCREEN" (Əsas səhifə - /home): Executive dashboard, active threat overview, recent scan stats.
   - "DOCUMENTS_SCREEN" (Sənədlər - /documents): All scanned documents repository, OCR vs PDF diff viewer, clean downloads.
   - "SCAN_SCREEN" (Skan et - /scan): Document upload, live 7-step security scanning sandbox.
   - "AI_SCREEN" (AI Assistant - /ai-assistant): Master SOC chat console for deep analytical dialogue and file reviews.
   - "SETTINGS_SCREEN" (Parametrlər - /settings): Security confidence thresholds, sanitizer rules, system config.
`.trim();

/**
 * Helper to extract navigation metadata if response contains link block or navigation intent
 */
export function extractNavigationMetadata(
  urlOrEnum?: string,
  label?: string
): { targetScreen: ScreenDestination; label: string; route: string } | undefined {
  if (!urlOrEnum) return undefined;
  
  const cleanEnum = urlOrEnum.trim().toUpperCase();
  const screenInfo = NAVIGATION_SCREENS[cleanEnum];
  
  if (screenInfo) {
    return {
      targetScreen: screenInfo.enum as ScreenDestination,
      label: label || `${screenInfo.nameAz} səhifəsinə keç`,
      route: screenInfo.route,
    };
  }

  // Fallback route mapping if enum is slightly formatted or path given
  for (const [key, info] of Object.entries(NAVIGATION_SCREENS)) {
    if (cleanEnum.includes(key) || cleanEnum === info.route.toUpperCase()) {
      return {
        targetScreen: info.enum as ScreenDestination,
        label: label || `${info.nameAz} səhifəsinə keç`,
        route: info.route,
      };
    }
  }

  return undefined;
}
