import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
            isConfidential: { type: 'boolean', example: false },
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
                hiddenTexts: { type: 'array', items: { type: 'string' } },
                textDifferenceFound: { type: 'boolean', example: false },
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
                requiresUserConfirmation: { type: 'boolean', example: false },
              },
            },
            layer3_llmReview: {
              type: 'object',
              properties: {
                used: { type: 'boolean', example: false },
                isMalicious: { type: 'boolean', example: false },
                confidence: { type: 'number', example: 0.98 },
                aiExplanation: { type: 'string', example: 'Sənəd hərtərəfli analiz edildi.' },
                recommendedAction: { type: 'string', example: 'Sənəd təhlükəsizdir. İcra oluna bilər.' },
                mitigationSteps: { type: 'array', items: { type: 'string' } },
              },
            },
            finalRiskScore: { type: 'integer', example: 12 },
            finalStatus: { type: 'string', enum: ['safe', 'suspicious', 'high_risk', 'blocked'], example: 'safe' },
            reviewedByUser: { type: 'boolean', example: false },
            userReviewLabel: { type: 'string', nullable: true, example: null },
            isContainInjection: { type: 'boolean', example: false },
            errorDetail: { type: 'string', nullable: true, example: null },
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
                  category: { type: 'string', example: 'Prompt Injection' },
                  count: { type: 'integer', example: 5 },
                },
              },
            },
          },
        },
        DepartmentEnum: {
          type: 'string',
          enum: [
            'İnformasiya Texnologiyaları və Kibertəhlükəsizlik',
            'Maliyyə və İqtisadiyyat',
            'Hüquq və Komplaens',
            'İnsan Resursları (HR)',
            'Əməliyyatlar və Logistika',
            'Strateji İnkişaf və Layihələr',
            'Ümumi Şöbə və Dəftərxana',
          ],
          example: 'İnformasiya Texnologiyaları və Kibertəhlükəsizlik',
        },
        User: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'usr-1787753837283-12' },
            fullName: { type: 'string', example: 'Samir Əliyev' },
            finCode: { type: 'string', example: '7AB1234' },
            email: { type: 'string', example: 'e.mammadov@soc.gov.az' },
            phone: { type: 'string', example: '+994 50 123 45 67' },
            role: { type: 'string', enum: ['admin', 'user', 'analyst'], example: 'user' },
            department: { $ref: '#/components/schemas/DepartmentEnum' },
            authProvider: { type: 'string', example: 'local' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['fullName', 'finCode', 'email', 'phone', 'password', 'department'],
          properties: {
            fullName: { type: 'string', example: 'Samir Əliyev' },
            finCode: { type: 'string', example: '7AB1234' },
            email: { type: 'string', example: 'e.mammadov@soc.gov.az' },
            phone: { type: 'string', example: '+994 50 123 45 67' },
            password: { type: 'string', example: 'SecretPassword123!' },
            department: { $ref: '#/components/schemas/DepartmentEnum' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['password'],
          properties: {
            finCode: { type: 'string', example: '7AB1234' },
            email: { type: 'string', example: 'e.mammadov@soc.gov.az' },
            password: { type: 'string', example: 'Admin123!' },
            rememberMe: { type: 'boolean', example: true },
          },
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: { type: 'string', example: '7AB1234', description: 'FİN code or Email' },
          },
        },
        ResendOtpRequest: {
          type: 'object',
          required: ['identifier'],
          properties: {
            identifier: { type: 'string', example: '7AB1234', description: 'FİN code or Email' },
          },
        },
        CheckOtpRequest: {
          type: 'object',
          required: ['identifier', 'otp'],
          properties: {
            identifier: { type: 'string', example: '7AB1234', description: 'FİN code or Email' },
            otp: { type: 'string', example: '123456', description: '6-digit OTP code' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['identifier', 'newPassword', 'resetToken'],
          properties: {
            identifier: { type: 'string', example: '7AB1234', description: 'FİN code or Email' },
            newPassword: { type: 'string', example: 'NewSecretPassword123!' },
            resetToken: { type: 'string', example: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e' },
          },
        },
        TrainModelRequest: {
          type: 'object',
          properties: {
            datasetVersion: { type: 'string', example: 'v2026.08' },
            epochs: { type: 'integer', example: 5 },
            batchSize: { type: 'integer', example: 32 },
          },
        },
        SendChatMessageRequest: {
          type: 'object',
          required: ['message'],
          properties: {
            chatMode: { type: 'string', enum: ['SMALL_CHAT', 'LARGE_CHAT'], example: 'LARGE_CHAT' },
            screenDestination: { type: 'string', enum: ['HOME_SCREEN', 'DOCUMENTS_SCREEN', 'SCAN_SCREEN', 'SETTINGS_SCREEN', 'AI_SCREEN'], example: 'DOCUMENTS_SCREEN' },
            message: { type: 'string', example: 'Salam, sənədlərdə olan prompt injection təhdidləri haqqında məlumat ver.' },
            sessionId: { type: 'string', example: 'session-1724500000' },
            documentId: { type: 'string', example: 'doc-1787753837283-457' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'attachment.pdf' },
                  content: { type: 'string', example: 'Internal text stream...' },
                },
              },
            },
          },
        },
        DocumentComparisonResponse: {
          type: 'object',
          properties: {
            documentId: { type: 'string', example: 'doc-1787753837283-457' },
            matchPercent: { type: 'number', example: 85 },
            textDifferenceFound: { type: 'boolean', example: true },
            diffs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  count: { type: 'integer', example: 40 },
                  added: { type: 'boolean', example: true },
                  removed: { type: 'boolean', example: false },
                  value: { type: 'string', example: '<ferqli>System prompt override...</ferqli>' },
                },
              },
            },
          },
        },
        CleanDocumentResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Prompt injection payloads successfully stripped from document.' },
            cleanedDocumentId: { type: 'string', example: 'doc-1787753837283-457' },
            downloadUrl: { type: 'string', example: 'https://storage.googleapis.com/myguard.appspot.com/cleaned/doc-1787753837283-457_cleaned.pdf' },
          },
        },
        LabelDocumentRequest: {
          type: 'object',
          required: ['isContainInjection'],
          properties: {
            isContainInjection: { type: 'boolean', example: true },
            userReviewLabel: { type: 'string', enum: ['confirmed_injection', 'false_positive'], example: 'confirmed_injection' },
          },
        },
        ChatMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'msg-1724500005' },
            sessionId: { type: 'string', example: 'session-1724500000' },
            sender: { type: 'string', enum: ['user', 'assistant'], example: 'assistant' },
            timestamp: { type: 'string', format: 'date-time' },
            content: { type: 'string', example: 'AI Asistent cavab mətni' },
            blocks: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
  },
  apis: [
    path.join(__dirname, '../modules/**/*.routes.ts'),
    path.join(__dirname, '../modules/**/*.routes.js'),
    path.join(__dirname, '../app.ts'),
    path.join(__dirname, '../app.js'),
    './src/modules/**/*.routes.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);

