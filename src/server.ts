import app from './app.js';
import { env } from './config/env.js';
import { isFirebaseInitialized } from './config/firebase.js';

app.listen(env.PORT, () => {
  console.log(`===================================================`);
  console.log(`[MyGuard Backend] Server running on port ${env.PORT}`);
  console.log(`[MyGuard Backend] Swagger Docs: http://localhost:${env.PORT}/api-docs`);
  console.log(`[MyGuard Backend] Firebase Admin: ${isFirebaseInitialized ? 'CONNECTED' : 'MOCK/DEV MODE'}`);
  console.log(`[MyGuard Backend] FastAPI Service: MOCKED (Will be provided externally)`);
  console.log(`===================================================`);
});
