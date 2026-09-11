import app from './app.js';
import { env } from './config/env.js';
import { isFirebaseInitialized } from './config/firebase.js';
import { checkFastApiHealth } from './modules/analysis/fastapi.service.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Client can join a specific document room to listen for events
  socket.on('join_document', (documentId: string) => {
    socket.join(`document:${documentId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined room: document:${documentId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : env.PORT;

httpServer.listen(PORT, async () => {
  const isFastApiHealthy = await checkFastApiHealth();
  console.log(`===================================================`);
  console.log(`[MyGuard Backend] Server running on port ${PORT}`);
  console.log(`[MyGuard Backend] Swagger Docs: http://localhost:${PORT}/api-docs`);
  console.log(`[MyGuard Backend] Firebase Admin: ${isFirebaseInitialized ? 'CONNECTED' : 'MOCK/DEV MODE'}`);
  console.log(`[MyGuard Backend] FastAPI Service: ${isFastApiHealthy ? `CONNECTED (${env.FASTAPI_ANALYSIS_URL})` : `UNAVAILABLE (${env.FASTAPI_ANALYSIS_URL})`}`);
  console.log(`===================================================`);

  // Test Firebase Admin Connection by writing a health check document
  if (isFirebaseInitialized) {
    try {
      // Lazy load db to avoid circular dependency issues at the top level if any
      const { db } = await import('./config/firebase.js');
      if (db) {
        const testRef = db.collection('system_tests').doc('startup_check');
        await testRef.set({
          message: 'Server started successfully',
          timestamp: new Date().toISOString(),
          status: 'OK'
        });
        console.log(`[Firebase Test] Uğurla 'system_tests' kolleksiyasına test mesajı yazıldı!`);
      }
    } catch (err) {
      console.error(`[Firebase Test Error] Test mesajı yazıla bilmədi:`, err);
    }
  }
});
