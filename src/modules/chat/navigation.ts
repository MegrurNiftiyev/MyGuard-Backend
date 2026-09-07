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
NAVIGATION & PAGE REDIRECTION RULE:
You are aware of all 5 main application screens in the sidebar menu:
1. "HOME_SCREEN" (Əsas səhifə): Executive dashboard, active threat overview, and recent scan stats.
2. "DOCUMENTS_SCREEN" (Sənədlər): Scanned documents repository, OCR diff viewer, and clean document downloads.
3. "SCAN_SCREEN" (Skan et): Document upload, live 7-step scanning sandbox, and immediate risk mitigation.
4. "AI_SCREEN" (AI Assistant): Master Security Operations Center chat console.
5. "SETTINGS_SCREEN" (Parametrlər): Confidence thresholds, security policies, and system settings.

WHENEVER the user asks to perform an action (e.g. upload/scan a file, view document list, change settings, go to home page, or switch screens):
1. Explain what page they need to visit in Azerbaijani.
2. YOU MUST INCLUDE A NAVIGATION REDIRECT "link" BLOCK IN YOUR JSON RESPONSE:
   {
     "type": "link",
     "label": "[Səhifə Adı] səhifəsinə keç",
     "url": "TARGET_SCREEN_ENUM",
     "content": "Açıqlama mətni..."
   }
   Where "url" MUST be exactly one of the enum strings: "HOME_SCREEN", "DOCUMENTS_SCREEN", "SCAN_SCREEN", "AI_SCREEN", "SETTINGS_SCREEN".
   When the user clicks this block in the UI, the frontend will automatically navigate to that screen!
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
