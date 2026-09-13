# 📌 Future Deployment & Main Branch Merge Guide

> [!IMPORTANT]
> This document serves as an explicit guide and reminder for merging the real FastAPI Layer 2 integration branch (`feat/fastapi-layer2-integration`) into `main` and deploying to Render in the future.

---

## 🛠️ Summary of Branch Changes (`feat/fastapi-layer2-integration`)

1. **Restored Real Layer 2 FastAPI Microservice:**
   - Switched Layer 2 Prompt Injection analysis from direct LLM classification back to the real RETVec + CNN Python FastAPI microservice (`POST /analyze-injection`).
   - Strictly enforces payload schema (`documentId`, `fullText`) and `X-Internal-Token` header.

2. **Purged All Mock Data & References:**
   - Completely deleted `mockAnalysis.service.ts`, `fallbackAnalysis.service.ts`, and `layer2ClassificationPrompt.ts`.
   - Created `securityAnalysis.types.ts` for clean TypeScript interfaces.
   - Removed all mock document helper generators from `documents.service.ts`.

3. **Internationalization & Dynamic Health:**
   - Updated `/api/health` to dynamically probe real FastAPI liveness (`checkFastApiHealth()`).
   - All console logs translated to English for international consistency.

---

## 🚀 How to Merge into `main` & Push to Remote

When you are ready to make these changes live on production:

```powershell
# 1. Checkout main branch
git checkout main

# 2. Merge feature branch into main
git merge feat/fastapi-layer2-integration

# 3. Push to GitHub main branch
git push origin main
```

---

## ⚠️ Render Deployment Reminder & Live Setup

> [!WARNING]
> **Render Live Service Deployment Notes:**
> - Render auto-deploys when commits are pushed to `main`.
> - Ensure `FASTAPI_ANALYSIS_URL` environment variable on Render points to your active FastAPI microservice instance (`https://myguard-ai-backend.onrender.com`).
> - Ensure `INTERNAL_SERVICE_TOKEN` environment variable on Render matches between Node.js backend and Python FastAPI service.
> - If you ever need to rollback to a specific previous commit on Render, go to **Render Dashboard -> Service -> Deploys -> Deploy a specific commit / Manual Deploy**.