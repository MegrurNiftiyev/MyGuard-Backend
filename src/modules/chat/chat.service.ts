import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { 
  SmallChatMessage, 
  LargeChatMessage, 
  MessageBlock, 
  ScreenDestination,
  AttachedDocumentPayload 
} from '../../types/index.js';
import { getSystemPromptFor } from './prompts.js';
import { extractNavigationMetadata } from './navigation.js';
import { env } from '../../config/env.js';
import { getRiskSummaryReport } from '../reports/reports.service.js';
import { getDocumentById, queryUserDocuments } from '../documents/documents.service.js';
import { classifyDocumentText } from '../analysis/fastapi.service.js';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const memoryMessages = new Map<string, LargeChatMessage[]>();

export async function createOrGetChatSession(userId: string, title?: string): Promise<ChatSession> {
  const sessionId = 'session-' + Date.now();
  const now = new Date().toISOString();

  const session: ChatSession = {
    id: sessionId,
    userId,
    title: title || 'Yeni Təhlükəsizlik Söhbəti',
    createdAt: now,
    updatedAt: now,
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.CHAT_SESSIONS).doc(sessionId).set(session);
    } catch (err) {
      console.warn('[Chat Service] Firestore set session error:', err);
    }
  }

  return session;
}

export async function getChatHistory(sessionId: string, limitCount: number = 10): Promise<LargeChatMessage[]> {
  if (isFirebaseInitialized && db) {
    try {
      const snapshot = await db
        .collection(COLLECTIONS.CHAT_MESSAGES)
        .where('sessionId', '==', sessionId)
        .get();

      const messages: LargeChatMessage[] = [];
      snapshot.forEach((doc: any) => messages.push(doc.data() as LargeChatMessage));
      if (messages.length > 0) {
        messages.sort((a, b) => {
          const timeA = a.createdAtISO ? new Date(a.createdAtISO).getTime() : (a.id ? parseInt(a.id.replace(/\D/g, '')) || 0 : 0);
          const timeB = b.createdAtISO ? new Date(b.createdAtISO).getTime() : (b.id ? parseInt(b.id.replace(/\D/g, '')) || 0 : 0);
          return timeA - timeB;
        });
        return messages.slice(-limitCount);
      }
    } catch (err) {
      console.warn('[Chat Service] Firestore get messages fallback:', err);
    }
  }

  const msgs = memoryMessages.get(sessionId) || [];
  if (msgs.length === 0) {
    // Yeni və ya boş sessiyalar üçün ilkin xoş gəlmisiniz mesajı (Demo / Initial Welcome Message)
    const welcomeMsg: LargeChatMessage = {
      id: 'msg-welcome-' + sessionId,
      sender: 'assistant',
      timestamp: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
      blocks: [
        {
          type: 'header',
          title: 'MyGuard AI Təhlükəsizlik Asistenti',
          subtitle: 'Sənədlərin təhlükəsizliyi, prompt injection analizi və risk hesabatları üzrə köməkçiniz.'
        },
        {
          type: 'callout',
          title: 'Sessiya Başladıldı',
          content: 'Sualınızı yazın və ya analiz etmək istədiyiniz sənəd haqqında məlumat tələb edin.',
          tone: 'info'
        }
      ]
    };
    return [welcomeMsg];
  }

  return msgs.slice(-limitCount);
}

export interface SmallChatLogEntry {
  screenDestination: ScreenDestination;
  message: string;
  reply: string;
}

export async function logSmallChatMessage(entry: SmallChatLogEntry) {
  if (isFirebaseInitialized && db) {
    db.collection('small_chat_logs').add({
      ...entry,
      timestamp: new Date().toISOString(),
    }).catch(err => {
      console.warn('[Chat Service] Failed to log small chat message:', err);
    });
  }
}

export interface SmallChatLlmResult {
  text: string;
  navigation?: {
    targetScreen: ScreenDestination;
    label: string;
    route: string;
  };
  blocks?: MessageBlock[];
}

export async function callLlmSmall(systemPrompt: string, message: string, userId: string = 'dev-user-123'): Promise<SmallChatLlmResult> {
  let liveContextPrompt = '';
  try {
    const summary = await getRiskSummaryReport(userId);
    const recentDocsStr = summary.documentsSummary && summary.documentsSummary.length > 0
      ? summary.documentsSummary.slice(0, 5).map(d => `- Fayl: **${d.fileName}** | Status: **${d.finalStatus}** | Risk Balı: **${d.finalRiskScore}/100** | Injection: **${d.isContainInjection ? 'VAR' : 'YOXDUR'}** | Yüklənmə Vaxtı: ${d.uploadedAt}`).join('\n')
      : 'Hələ ki sənəd yüklənməyib.';

    liveContextPrompt = `
LIVE SYSTEM AND DOCUMENTS CONTEXT:
- Total Scanned Documents: ${summary.totalScanned}
- Safe Documents: ${summary.safeCount}
- Suspicious Documents: ${summary.suspiciousCount}
- High Risk / Blocked Documents: ${summary.blockedCount}
- Prompt Injections Detected: ${summary.detectedInjectionsCount}

[RECENT 5 UPLOADED DOCUMENTS]
${recentDocsStr}
`;
  } catch (err) {
    console.warn('[Chat Service] Small Chat Live Context fetch failed:', err);
  }

  const smallChatPromptHeader = `${systemPrompt}
${liveContextPrompt}

SMALL CHAT CONTRACT AND FORMATTING RULES:
1. Answer user questions directly using the live database stats provided above.
2. FORMAT RESPONSE IN PURE TEXT / MARKDOWN ONLY. Do NOT output large table or chart blocks.
3. Use **bold** text (e.g. **High Risk (88/100)**, **maliyye_hesabati.pdf**, **14 sənəd**) to emphasize key numbers, status, and file names.
4. Use bullet lists (- item 1) or numbered lists (1. item) when listing items.
5. IF the user asks to navigate to a page OR if a shortcut link at the end of the text is helpful:
   - Include a "link" block in "blocks" array with "url" set to one of: "HOME_SCREEN", "DOCUMENTS_SCREEN", "SCAN_SCREEN", "AI_SCREEN", "SETTINGS_SCREEN".
   - Include a "navigation" object: { "targetScreen": "ENUM", "label": "Səhifəyə keç", "route": "/route" }.
6. Respond in JSON format matching schema:
{
  "text": "Detailed text response with **bold** highlights...",
  "navigation": { "targetScreen": "SCAN_SCREEN", "label": "Skan Et səhifəsinə keç", "route": "/scan" },
  "blocks": [
    { "type": "link", "label": "Skan Et səhifəsinə keç", "url": "SCAN_SCREEN", "content": "Sənəd yükləmək üçün keçid." }
  ]
}
If no navigation is needed, "navigation" and "blocks" can be omitted.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: smallChatPromptHeader },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API failed: ${response.status} ${await response.text()}`);
    }

    const json = await response.json();
    const rawContent = json.choices[0]?.message?.content || '';

    let parsedText = 'Cavab formalaşdırıla bilmədi.';
    let navMetadata: SmallChatLlmResult['navigation'] = undefined;
    let responseBlocks: MessageBlock[] = [];

    try {
      const parsed = JSON.parse(rawContent);
      parsedText = parsed.text || parsed.reply || parsed.content || rawContent;
      if (Array.isArray(parsed.blocks)) {
        responseBlocks = parsed.blocks;
      }
      if (parsed.navigation && parsed.navigation.targetScreen) {
        navMetadata = extractNavigationMetadata(parsed.navigation.targetScreen, parsed.navigation.label);
      }
    } catch {
      parsedText = rawContent;
    }

    // Check blocks for type: 'link' if navMetadata is not yet set
    if (!navMetadata && responseBlocks.length > 0) {
      const linkBlock = responseBlocks.find(b => b.type === 'link' && b.url);
      if (linkBlock) {
        navMetadata = extractNavigationMetadata(linkBlock.url, linkBlock.label);
      }
    }

    // Intent detection fallback ONLY when user explicitly uses navigation action verbs
    if (!navMetadata) {
      const lowerUserMsg = message.toLowerCase();
      const isExplicitNavRequest = /keç|aç|yönləndir|apar|gedim|getmək|keçmək|baxmaq\s+istəyirəm/i.test(lowerUserMsg);
      
      if (isExplicitNavRequest) {
        if (lowerUserMsg.includes('skan') || lowerUserMsg.includes('yüklə') || lowerUserMsg.includes('scan')) {
          navMetadata = extractNavigationMetadata('SCAN_SCREEN');
        } else if (lowerUserMsg.includes('sənəd') || lowerUserMsg.includes('document')) {
          navMetadata = extractNavigationMetadata('DOCUMENTS_SCREEN');
        } else if (lowerUserMsg.includes('parametr') || lowerUserMsg.includes('tənzimləmə') || lowerUserMsg.includes('setting')) {
          navMetadata = extractNavigationMetadata('SETTINGS_SCREEN');
        } else if (lowerUserMsg.includes('ana səhifə') || lowerUserMsg.includes('əsas səhifə') || lowerUserMsg.includes('home')) {
          navMetadata = extractNavigationMetadata('HOME_SCREEN');
        } else if (lowerUserMsg.includes('ai') || lowerUserMsg.includes('assistant') || lowerUserMsg.includes('konsol')) {
          navMetadata = extractNavigationMetadata('AI_SCREEN');
        }
      }
    }

    // Automatically ensure blocks contains the link block if navMetadata exists
    if (navMetadata && !responseBlocks.some(b => b.type === 'link' && (b.url === navMetadata?.targetScreen || b.url === navMetadata?.route))) {
      responseBlocks.push({
        type: 'link',
        label: navMetadata.label,
        url: navMetadata.targetScreen,
        content: parsedText
      });
    }

    return {
      text: parsedText,
      navigation: navMetadata,
      blocks: responseBlocks.length > 0 ? responseBlocks : undefined
    };

  } catch (err: any) {
    console.error(`[Chat Service] Small Chat Error: ${err.message}`);
    return {
      text: 'Üzr istəyirik, təhlil zamanı xəta baş verdi və ya AI servisi əlçatmazdır.'
    };
  }
}


export async function callLlmLarge(
  systemPrompt: string, 
  history: LargeChatMessage[], 
  message: string, 
  screenDestination?: string, 
  userId: string = 'dev-user-123',
  docId?: string,
  attachedDocument?: AttachedDocumentPayload,
  filesList?: AttachedDocumentPayload[]
): Promise<MessageBlock[]> {
  let docContextPrompt = '';
  if (docId) {
    const doc = await getDocumentById(docId);
    if (doc) {
      docContextPrompt = `\n
[MYGUARD VERIFIED SECURITY REPORT FOR ATTACHED DOCUMENT: "${doc.fileName}"]
- Document ID: ${doc.id}
- Final Status: ${doc.finalStatus || 'safe'}
- Risk Score: ${doc.finalRiskScore ?? 0}/100
- OCR vs PDF Text Match: ${doc.layer1_ocrTextMatch?.matchPercent ?? 100}%
- Hidden Text Detected: ${doc.layer1_ocrTextMatch?.hiddenTextDetected ? 'YES' : 'NO'}
- Prompt Injection Detected: ${doc.isContainInjection ? 'YES (HIGH RISK)' : 'NO (SAFE)'}
- ML Classifier Verdict: ${doc.layer2_classification?.label || 'safe'}
- LLM Security Summary: ${doc.layer3_llmReview?.aiExplanation || 'No malicious payload detected.'}
<untrusted_document_context filename="${doc.fileName}">
${doc.layer1_ocrTextMatch?.ocrText || 'Document text content.'}
</untrusted_document_context>
`;
    }
  }

  // Handle files list or single attached document
  const activeFiles: AttachedDocumentPayload[] = [];
  if (filesList && filesList.length > 0) {
    activeFiles.push(...filesList);
  } else if (attachedDocument) {
    activeFiles.push(attachedDocument);
  }

  if (activeFiles.length > 0) {
    docContextPrompt += `\n[ATTACHED USER DOCUMENTS FOR LIVE SECURITY SCAN VIA FASTAPI ML MODEL (${activeFiles.length} File(s))]\n`;
    for (let i = 0; i < activeFiles.length; i++) {
      const f = activeFiles[i];
      const fileName = f.name || f.fileName || `attached_file_${i + 1}.txt`;
      const rawText = f.content || f.text || '';
      
      // Real-time classification call to Python FastAPI ML Microservice (RETVec + CNN Model)
      const fastApiResult = await classifyDocumentText({
        documentId: `chat-file-${Date.now()}-${i}`,
        fullText: rawText || fileName,
      });

      let maliciousProbability = 0;
      let securityVerdict = 'SAFE / CLEAN (Təhlükəsiz)';
      let categoriesStr = 'Yoxdur';
      let confidenceVal = 0.99;

      if (fastApiResult) {
        confidenceVal = fastApiResult.confidence;
        if (fastApiResult.label === 'injection') {
          maliciousProbability = Math.round(fastApiResult.confidence * 100);
          securityVerdict = 'HIGH RISK / PROMPT INJECTION DETECTED (Zərərli)';
        } else if (fastApiResult.label === 'suspicious') {
          maliciousProbability = Math.round(fastApiResult.confidence * 100);
          securityVerdict = 'SUSPICIOUS / POTENTIAL THREAT (Şübhəli)';
        } else {
          maliciousProbability = Math.round((1 - fastApiResult.confidence) * 100);
          securityVerdict = 'SAFE / CLEAN (Təhlükəsiz)';
        }
        if (fastApiResult.categories && fastApiResult.categories.length > 0) {
          categoriesStr = fastApiResult.categories.join(', ');
        }
      } else {
        // Fallback pre-scan if FastAPI microservice is offline
        const hasInjectionPattern = /ignore\s+previous\s+instructions|system\s+directive|override|you\s+must\s+rank/i.test(rawText);
        maliciousProbability = hasInjectionPattern ? 88 : 10;
        securityVerdict = hasInjectionPattern ? 'SUSPICIOUS / INJECTION PATTERNS DETECTED (Şübhəli - Pre-Scan Fallback)' : 'SAFE / CLEAN (Pre-Scan Baseline)';
      }

      docContextPrompt += `
--- FAYL ${i + 1}: "${fileName}" ---
- Fayl Adı (File Name): ${fileName}
- Python FastAPI ML (RETVec + CNN Model) Analiz Kararı: ${securityVerdict}
- Zərərli Olma Ehtimalı (Malicious Probability %): ${maliciousProbability}%
- Model Əminlik Faizi (Confidence): ${(confidenceVal * 100).toFixed(1)}%
- Aşkar Olunan Kateqoriyalar: ${categoriesStr}
- Faylın Daxili Mətni (Content):
<untrusted_document_context filename="${fileName}">
${rawText}
</untrusted_document_context>
`;
    }
  }

  const tools = [
    {
      type: "function",
      function: {
        name: "get_risk_summary",
        description: "Get the current risk summary dashboard stats including total scanned, blocked risks, etc.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "get_document_analysis",
        description: "Get detailed security analysis and OCR diffs for a specific document ID.",
        parameters: {
          type: "object",
          properties: {
            documentId: { type: "string", description: "The ID of the document to lookup" }
          },
          required: ["documentId"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "query_user_documents",
        description: "Query and filter user documents. Use this when the user asks about specific files, searches for content, or asks for recent scans. Returns only the requested fields to save tokens.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Maximum number of documents to return." },
            hasInjection: { type: "boolean", description: "Filter by prompt injection presence." },
            riskStatus: { type: "string", description: "Filter by risk status (e.g., 'safe', 'suspicious', 'high_risk', 'blocked')." },
            fileType: { type: "string", description: "Filter by file extension (e.g., 'pdf', 'docx')." },
            searchQuery: { type: "string", description: "Regex or keyword to search in fileName and ocrText." },
            documentId: { type: "string", description: "Exact ID of the document to retrieve." },
            startDate: { type: "string", description: "ISO date string to filter documents uploaded after this date." },
            endDate: { type: "string", description: "ISO date string to filter documents uploaded before this date." },
            minRiskScore: { type: "number", description: "Minimum risk score (0-100)." },
            maxRiskScore: { type: "number", description: "Maximum risk score (0-100)." },
            isConfidential: { type: "boolean", description: "Filter by confidentiality status." },
            sortOrder: { type: "string", enum: ["asc", "desc"], description: "Sort documents by upload date. Defaults to desc." },
            fieldsToReturn: { 
              type: "array", 
              items: { type: "string" },
              description: "Array of specific fields to return (e.g. ['id', 'fileName', 'finalRiskScore', 'layer3_llmReview.explanation']). Only ask for heavy fields like 'layer1_ocrTextMatch.ocrText' if specifically needed!"
            }
          }
        }
      }
    }
  ];

  const fullSystemPrompt = `${systemPrompt}${docContextPrompt}
You are MyGuard AI Security Assistant. The user is currently viewing the ${screenDestination || 'CURRENT'} screen.
Answer user questions clearly, accurately, and concisely.

CRITICAL RULE FOR QUERYING DOCUMENTS:
- When a user asks about their files (e.g., "what are my recent files?", "search for invoice", "show me files with injections"), ALWAYS use the \`query_user_documents\` tool.
- TOKEN CONSERVATION: When using \`query_user_documents\`, ALWAYS use the \`fieldsToReturn\` parameter to fetch ONLY the fields you need. For example, if the user just wants a list of recent files, request \`['id', 'fileName', 'uploadedAt', 'finalRiskScore']\`. DO NOT request heavy fields like \`layer1_ocrTextMatch.ocrText\` unless the user explicitly asks for the document's content.
- 3-TRY LIMIT: You have up to 3 attempts to call tools per response. If your first query doesn't find the result, you can automatically try another tool call with different parameters. If you still can't find it after 3 tries, inform the user you couldn't find the data.
- RECURSIVE SEARCH: If you need to deep dive into a specific file, you can first query it by name (returning \`id\`, \`fileName\`), and then make a follow-up tool call to \`get_document_analysis\` using that \`id\`.
- LINKING: Whenever you present a document, you can create a link for the user to view its analysis page using the format \`/documents/{id}\`. For example: \`{ "type": "link", "url": "/documents/" + doc.id, "label": "Bax: " + doc.fileName, "content": "..." }\`.

CRITICAL RULE FOR RISK STATS, SCAN RESULTS & DASHBOARDS:
- NEVER invent, fabricate, or use template/hardcoded numbers when asked about scan results, total documents, risk status, or injection counts.
- ALWAYS call \`get_risk_summary\` to retrieve the REAL user documents and live database statistics.
- WHEN PRESENTING RISK OR SCAN STATS, YOU MUST RETURN ALL OF THE FOLLOWING BLOCKS IN YOUR JSON RESPONSE:
  1. A "text" block introducing the user's scanning summary.
  2. A "callout" block (tone: "danger" if injections exist, else "success") displaying key metrics: Total Scanned, Injection Count, and Safe Count.
  3. A "chart" block visualizing the weekly/daily risk trend from the live data (chartType: "bar", chartKeys: { nameKey: "date", dataKeys: [{ key: "safe", tone: "success", label: "Təhlükəsiz" }, { key: "blocked", tone: "danger", label: "İnyeksiya / Blok" }] }, chartData: riskTrend).
  4. A "table" block listing the user's actual scanned documents with headers ["Sənəd Adı", "Yüklənmə Tarixi", "Risk Balı", "Status", "İnyeksiya Statusu"] using the exact documentsSummary array!

CRITICAL FORMAT RULE: Output a JSON object containing a "blocks" array matching the schema:
{
  "blocks": [
    { "type": "text", "content": "..." },
    { "type": "callout", "title": "...", "content": "...", "tone": "danger|warning|info|success" },
    {
      "type": "chart",
      "title": "Sənəd Riskləri Və İnyeksiya Dinamikası",
      "subtitle": "Canlı baza göstəriciləri",
      "chartType": "bar",
      "chartKeys": {
        "nameKey": "date",
        "dataKeys": [
          { "key": "safe", "tone": "success", "label": "Təhlükəsiz" },
          { "key": "blocked", "tone": "danger", "label": "İnyeksiya / Blok" }
        ]
      },
      "chartData": [ { "date": "...", "safe": 0, "blocked": 0 } ]
    },
    {
      "type": "table",
      "title": "İstifadəçinin Skan Edilmiş Faktiki Sənədləri",
      "headers": ["Sənəd Adı", "Yüklənmə Tarixi", "Risk Balı", "Status", "İnyeksiya Statusu"],
      "rows": [
        ["fayl.pdf", "2026-09-04 14:10", "85", "BLOCKED", "Aşkarlandı (Var)"]
      ]
    }
  ]
}
Do NOT use Markdown outside of text blocks. Only return a valid JSON object matching this schema.`;

  const messages: any[] = [
    { role: 'system', content: fullSystemPrompt },
  ];

  // Append history
  for (const h of history) {
    if (h.sender === 'user') {
      const userText = h.blocks.filter(b => b.type === 'text').map(b => b.content).join('\n');
      messages.push({ role: 'user', content: userText });
    } else {
      // Stringify blocks back to JSON for assistant context
      messages.push({ role: 'assistant', content: JSON.stringify({ blocks: h.blocks }) });
    }
  }

  // Add current message
  messages.push({ role: 'user', content: message });

  try {
    let finalBlocks: MessageBlock[] = [];
    let toolLoopLimit = 3;
    let loopCount = 0;

    while (loopCount < toolLoopLimit) {
      loopCount++;
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          tools: tools,
          tool_choice: 'auto',
          messages: messages,
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API failed: ${response.status} ${await response.text()}`);
      }

      const json = await response.json();
      const responseMessage = json.choices[0].message;

      if (responseMessage.tool_calls) {
        messages.push(responseMessage); // Add assistant's tool call message
        
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments || '{}');
          
          let toolResultStr = '';
          if (functionName === 'get_risk_summary') {
            const summary = await getRiskSummaryReport(userId);
            toolResultStr = JSON.stringify(summary);
          } else if (functionName === 'get_document_analysis') {
            const doc = await getDocumentById(args.documentId);
            if (!doc) {
              toolResultStr = JSON.stringify({ error: 'Document not found' });
            } else {
              // Wrap untrusted text
              toolResultStr = JSON.stringify({
                metadata: doc,
                untrusted_content: `<untrusted_document_context>${doc.layer1_ocrTextMatch?.ocrText || ''}</untrusted_document_context>`
              });
            }
          } else if (functionName === 'query_user_documents') {
            const results = await queryUserDocuments(userId, args);
            toolResultStr = JSON.stringify(results);
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: functionName,
            content: toolResultStr,
          });
        }
      } else {
        // We got a final JSON output
        const parsed = JSON.parse(responseMessage.content);
        finalBlocks = parsed.blocks || [];
        break;
      }
    }

    if (finalBlocks.length > 0) return finalBlocks;

  } catch (err: any) {
    console.error(`[Chat Service] Large Chat Error: ${err.message}`);
  }

  // Fallback if LLM fails
  return [
    { type: 'text', content: 'Üzr istəyirik, təhlil zamanı xəta baş verdi və ya AI servisi əlçatmazdır.' },
    { type: 'callout', content: 'Zəhmət olmasa biraz sonra yenidən cəhd edin.', tone: 'warning' }
  ];
}

export async function appendToHistory(sessionId: string, userMessageText: string, blocks: MessageBlock[]): Promise<LargeChatMessage> {
  const now = new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
  const isoNow = new Date().toISOString();
  const userMsgId = 'msg-' + Date.now();
  const assistantMsgId = 'msg-' + (Date.now() + 1);

  const userMessage: LargeChatMessage = {
    id: userMsgId,
    sender: 'user',
    timestamp: now,
    createdAtISO: isoNow,
    blocks: [{ type: 'text', content: userMessageText }],
  };

  const assistantMessage: LargeChatMessage = {
    id: assistantMsgId,
    sender: 'assistant',
    timestamp: now,
    createdAtISO: isoNow,
    blocks,
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.CHAT_MESSAGES).doc(userMsgId).set({ ...userMessage, sessionId });
      await db.collection(COLLECTIONS.CHAT_MESSAGES).doc(assistantMsgId).set({ ...assistantMessage, sessionId });
    } catch (err) {
      console.warn('[Chat Service] Firestore save message error:', err);
    }
  }

  const existingMsgs = memoryMessages.get(sessionId) || [];
  existingMsgs.push(userMessage, assistantMessage);
  memoryMessages.set(sessionId, existingMsgs);

  return assistantMessage;
}


