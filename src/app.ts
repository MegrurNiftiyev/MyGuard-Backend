import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { requireAuth } from './middlewares/requireAuth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { swaggerSpec } from './config/swagger.js';
import { isFirebaseInitialized } from './config/firebase.js';

import authRoutes from './modules/auth/auth.routes.js';
import documentRoutes from './modules/documents/documents.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import usersRoutes from './modules/users/users.routes.js';

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Interactive API Documentation UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  swaggerOptions: {
    operationsSorter: (a: any, b: any) => {
      const methodsOrder = ["get", "post", "patch", "put", "delete", "options", "trace"];
      let result = methodsOrder.indexOf(a.get("method")) - methodsOrder.indexOf(b.get("method"));
      if (result === 0) {
        result = a.get("path").localeCompare(b.get("path"));
      }
      return result;
    }
  }
}));

// Health & Status Endpoint
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: System operational status check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Operational status
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    firebaseInitialized: isFirebaseInitialized,
    mode: process.env.NODE_ENV || 'development',
    fastApiMocked: true,
    swaggerDocsUrl: '/api-docs',
  });
});

// Authentication Routes (Public & Protected routes handled internally)
app.use('/api/auth', authRoutes);


// Protected Core Application Routes (Token Authentication Enforced)
app.use('/api/users', requireAuth, usersRoutes);
app.use('/api/documents', requireAuth, documentRoutes);
app.use('/api/reports', requireAuth, reportRoutes);
app.use('/api/chat', requireAuth, chatRoutes);
app.use('/api/admin', requireAuth, adminRoutes);


// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tapılmadı. Swagger üçün /api-docs keçidinə baxın.' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
