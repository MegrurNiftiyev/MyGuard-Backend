# MyGuard Backend — Repository Maintenance & Temporary Layer 2 LLM Cleanup Guide

## 1. Overview & Architecture Context
This document serves as an explicit reference for developers and AI assistants working on the **MyGuard Backend** codebase.

During MVP finalization, two distinct changes were made to the `main` branch:
1. **Permanent Server Crash Fix (OCR Rendering & Exception Safety)**: Solved Node.js C++ `canvas.node` binary crash during PDF OCR scanning.
2. **Temporary Layer 2 LLM Security Prompt**: Temporary semantic classification prompt used until the final RETVec/CNN FastAPI microservice is deployed.

To enable zero-friction removal of the temporary LLM prompt layer in the future, these changes were committed in **two separate, isolated Git commits** on the `main` branch.

---

## 2. Git Commit Architecture on `main` Branch

```
[HEAD -> main]  b7cd70a : feat: add temporary Layer 2 LLM prompt classifier
                8070eac : fix(ocr): replace canvas C++ dependency with @napi-rs/canvas ...
                ac5fd7f : docs: detail chat file attachment architecture ...
```

### Commit Breakdown:

#### 1️⃣ `8070eac` — Permanent System Stability Fix (DO NOT REMOVE)
* **Commit**: `8070eac`
* **Message**: `fix(ocr): replace canvas C++ dependency with @napi-rs/canvas and wrap background scan pipeline in try/catch to prevent server crash`
* **Purpose**:
  - Replaced native C++ `node-canvas` dependency in `src/modules/analysis/ocrTextCompare.service.ts` with Rust-based `@napi-rs/canvas`.
  - Wrapped `runPipeline` in `src/modules/documents/documents.service.ts` inside a top-level `try/catch` block to guarantee background scanning never crashes the Express server.
* **Status**: **PERMANENT**. Must remain in the repository.

#### 2️⃣ `b7cd70a` — Temporary Layer 2 LLM Prompt Classifier (TO BE REMOVED LATER)
* **Commit**: `b7cd70a`
* **Message**: `feat: add temporary Layer 2 LLM prompt classifier`
* **Files Affected**:
  - `src/modules/analysis/layer2ClassificationPrompt.ts`
  - `.gitignore`
* **Status**: **TEMPORARY**. To be removed when the real FastAPI Layer 2 model is connected.

---

## 3. Instructions for AI / Developers: How to Remove the Temporary LLM Prompt

When replacing the temporary LLM prompt with the final FastAPI integration, run **one** of the following options:

### Option A: Standard Revert (Recommended for Shared Repositories)
Run this command in the terminal:
```bash
git revert b7cd70a -m "chore: remove temporary Layer 2 LLM prompt classifier"
git push origin main
```
*Result*: Safely removes `src/modules/analysis/layer2ClassificationPrompt.ts` while preserving full commit history and leaving the OCR crash fix (`8070eac`) 100% active.

### Option B: Hard Reset (For Clean Un-pushed History)
If force-pushing to `main` is permitted:
```bash
git reset --hard 8070eac
git push origin main --force
```
*Result*: Resets `main` directly back to the OCR crash fix commit (`8070eac`), completely erasing the temporary prompt commit.

---

## 4. Verification & Testing Protocol
To verify that document uploading and scanning operate without crashing the server:
```bash
npx tsx scratch/test_full_system.ts
```
Expected behavior:
- `POST /api/documents/upload` returns HTTP 200 with document ID.
- Express server stays online without unhandled process exceptions.
