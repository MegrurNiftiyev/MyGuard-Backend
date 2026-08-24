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
            id: { type: 'string', example: 'doc-1724500000' },
            userId: { type: 'string', example: 'dev-user-123' },
            name: { type: 'string', example: 'security_report.pdf' },
            sizeBytes: { type: 'integer', example: 1048576 },
            mimeType: { type: 'string', example: 'application/pdf' },
            uploadDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed', 'blocked'] },
            riskLevel: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
            riskScore: { type: 'integer', example: 92 },
            fileUrl: { type: 'string', example: '/uploads/doc-1724500000_security_report.pdf' },
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
