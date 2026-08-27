import swaggerJSDoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MyGuard - AI Document Security Gateway API',
      version: '1.0.0',
      description:
        'Modular REST API for MyGuard AI Document Security Gateway. Provides document security scanning, OCR ↔ PDF comparison, Prompt Injection classification, risk analytics, and AI Assistant chat sessions.',
      contact: {
        name: 'Megrur Niftiyev',
        email: 'megrurniftiyev@gmail.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token passed as Bearer token in Authorization header',
        },
      },
      schemas: {
        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'doc-1787753837283-457' },
            ownerId: { type: 'string', example: 'usr-admin-001' },
            fileName: { type: 'string', example: 'injection_iclas_007.pdf' },
            fileSizeBytes: { type: 'integer', example: 3335 },
            fileType: { type: 'string', example: 'pdf' },
            uploadUrl: { type: 'string', example: 'gs://mygurad.firebasestorage.app/documents/usr-admin-001/doc-1787753837283-457_injection_iclas_007.pdf' },
            uploadedAt: { type: 'string', format: 'date-time' },
            scanStartedAt: { type: 'string', format: 'date-time' },
            scanFinishedAt: { type: 'string', format: 'date-time' },
            scanDurationMs: { type: 'integer', example: 17258 },
            currentStep: { type: 'string', example: 'COMPLETED' },
            stepStatus: { type: 'string', example: 'completed' },
            stepHistory: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step: { type: 'string', example: 'DOCUMENT_UPLOADED' },
                  startedAt: { type: 'string', format: 'date-time' },
                  finishedAt: { type: 'string', format: 'date-time' },
                  status: { type: 'string', example: 'completed' },
                  message: { type: 'string', example: 'Fayl təhlükəsiz sandbox mühitinə daxil oldu' },
                },
              },
            },
            layer1_ocrTextMatch: {
              type: 'object',
              properties: {
                matchPercent: { type: 'number', example: 100 },
                hiddenTextDetected: { type: 'boolean', example: false },
                extraTextSegments: { type: 'array', items: { type: 'string' } },
                textDifferenceFound: { type: 'boolean', example: false },
                differenceSnippet: { type: 'string', example: '' },
                ocrText: { type: 'string', example: 'Skan edilmiş OCR mətni...' },
                pdfTextLayer: { type: 'string', example: 'PDF daxili raw text qatı...' },
                status: { type: 'string', example: 'clean' },
              },
            },
            layer2_classification: {
              type: 'object',
              properties: {
                label: { type: 'string', example: 'safe' },
                confidence: { type: 'number', example: 0.98 },
                accuracy: { type: 'number', example: 0.98 },
                message: { type: 'string', example: 'ML classifier tərəfindən sənəd hərtərəfli təhlil edildi.' },
                categories: { type: 'array', items: { type: 'string' } },
                requiresUserConfirmation: { type: 'boolean', example: false },
              },
            },
            layer3_llmReview: {
              type: 'object',
              properties: {
                used: { type: 'boolean', example: false },
                explanation: { type: 'string', example: 'Sənəd hərtərəfli analiz edildi.' },
                message: { type: 'string', example: 'Sənəd hərtərəfli analiz edildi.' },
                recommendedAction: { type: 'string', example: 'Sənəd təhlükəsizdir. İcra oluna bilər.' },
              },
            },
            finalRiskScore: { type: 'integer', example: 12 },
            finalStatus: { type: 'string', example: 'safe' },
            reviewedByUser: { type: 'boolean', example: false },
            userReviewLabel: { type: 'boolean', nullable: true, example: null },
            isContainInjection: { type: 'boolean', example: false },
            errorDetail: { type: 'string', nullable: true, example: null },
          },
        },
        AnalysisResult: {
          type: 'object',
          properties: {
            documentId: { type: 'string' },
            analyzedAt: { type: 'string', format: 'date-time' },
            overallRiskScore: { type: 'integer', example: 92 },
            status: { type: 'string', enum: ['safe', 'suspicious', 'blocked'] },
            layer1_ocrTextMatch: {
              type: 'object',
              properties: {
                matchPercent: { type: 'number', example: 85 },
                hiddenTextDetected: { type: 'boolean', example: true },
                extraTextSegments: { type: 'array', items: { type: 'string' } },
              },
            },
            layer2_classification: {
              type: 'object',
              properties: {
                classification: { type: 'string', example: 'High Risk' },
                confidence: { type: 'number', example: 0.94 },
                isInjection: { type: 'boolean', example: true },
                riskCategory: { type: 'string', example: 'Prompt Injection' },
                matchedSignatures: { type: 'array', items: { type: 'string' } },
              },
            },
            layer3_llmAnalysis: {
              type: 'object',
              properties: {
                isMalicious: { type: 'boolean', example: true },
                confidence: { type: 'number', example: 0.97 },
                explanation: { type: 'string' },
                recommendedAction: { type: 'string' },
                attackVector: { type: 'string' },
                mitigationSteps: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
        RiskSummary: {
          type: 'object',
          properties: {
            totalScanned: { type: 'integer', example: 45 },
            safeCount: { type: 'integer', example: 30 },
            suspiciousCount: { type: 'integer', example: 10 },
            blockedCount: { type: 'integer', example: 5 },
            highRiskPercentage: { type: 'integer', example: 33 },
            topRiskCategories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { type: 'string' },
                  count: { type: 'integer' },
                },
              },
            },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sessionId: { type: 'string' },
            sender: { type: 'string', enum: ['user', 'assistant'] },
            timestamp: { type: 'string', format: 'date-time' },
            content: { type: 'string' },
            blocks: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/app.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
