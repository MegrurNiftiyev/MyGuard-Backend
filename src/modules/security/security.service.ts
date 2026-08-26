import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { AgentActivityLog } from './security.schema.js';

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
    reason: 'Kritik məxfi olan daxili əməkhaqqı hesabatının xarici gmail ünvanına göndərilməsi avtomatik bloka alındı.',
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
  {
    id: 'int-1',
    agent: 'HR Agent',
    action: 'Send document by email',
    file: 'internal_salary_report.pdf',
    destination: 'external@gmail.com',
    sensitivity: 'High',
    decision: 'BLOCKED',
    reason: 'Policy restriction on external domains.',
    timestamp: '14:28'
  },
  {
    id: 'int-2',
    agent: 'Data Fetcher Agent',
    action: 'Query Knowledge Base',
    file: 'Public_HR_Policy_2025.pdf',
    destination: 'Internal Vector DB',
    sensitivity: 'Low',
    decision: 'ALLOWED',
    reason: 'Public policy document, safe to query.',
    timestamp: '11:40'
  }
];

export async function getAgentActionsList(): Promise<AgentActivityLog[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db.collection(COLLECTIONS.SECURITY_EVENTS).get();
      if (!snapshot.empty) {
        const list: AgentActivityLog[] = [];
        snapshot.forEach((doc: any) => list.push(doc.data() as AgentActivityLog));
        return list;
      }
    } catch (err) {
      console.warn('[Security Service] Firestore get fallback:', err);
    }
  }
  return defaultAgentActions;
}



export async function updateActionDecision(
  actionId: string,
  decision: 'ALLOWED' | 'BLOCKED'
): Promise<AgentActivityLog | null> {
  const item = defaultAgentActions.find((a) => a.id === actionId);
  if (item) {
    item.decision = decision;
    if (isFirebaseInitialized && db) {
      try {
        await db.collection(COLLECTIONS.SECURITY_EVENTS).doc(actionId).set(item, { merge: true });
      } catch (err) {
        console.warn('[Security Service] Firestore update error:', err);
      }
    }
    return item;
  }
  return null;
}
