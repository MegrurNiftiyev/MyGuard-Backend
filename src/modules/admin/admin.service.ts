import { AgentActivityLog } from './admin.schema.js';

const defaultAgentActions: AgentActivityLog[] = [
  {
    id: 'act-101',
    agent: 'Mail Gateway Agent',
    action: 'Send document by email',
    file: 'internal_salary_report.pdf',
    destination: 'external@gmail.com',
    sensitivity: 'Critical',
    decision: 'BLOCKED',
    timestamp: '14:28:10',
    reason: 'Kritik məfili olan daxili əməkhaqqı hesabatının xarici gmail ünvanına göndərilməsi avtomatik bloka alındı.',
  },
  {
    id: 'act-102',
    agent: 'Cloud Sync Agent',
    action: 'Upload confidential file',
    file: 'Defense_Strategy_2026.docx',
    destination: 'External cloud server (api.untrusted.com)',
    sensitivity: 'Critical',
    decision: 'BLOCKED',
    timestamp: '13:15:44',
    reason: 'İzolyasiya olunmuş konfidensial faylın xarici serverə yüklənməsi cəhdi dayandırıldı.',
  },
  {
    id: 'act-103',
    agent: 'Data Fetcher Agent',
    action: 'Query Knowledge Base',
    file: 'Public_HR_Policy_2025.pdf',
    destination: 'Internal Vector Database',
    sensitivity: 'Low',
    decision: 'ALLOWED',
    timestamp: '11:40:02',
    reason: 'İctimai HR qaydalarının daxili bazada sorğulanması təhlükəsiz hesab edildi.',
  },
];

export async function getAgentActions(): Promise<AgentActivityLog[]> {
  return defaultAgentActions;
}
