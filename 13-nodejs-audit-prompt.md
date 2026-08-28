# Node.js Backend — Full Current-State Audit (No Code Changes)

## Purpose

Report the exact current state of the Node.js backend (MyGuard). A lot has changed since the last audit (real Layer 3/LLM review reportedly added, chat modes, new endpoints like clean-injection/label-by-user/settings). **Do not write, edit, or refactor any code.** Only read and report, based strictly on what's actually in the code — not on what any doc/README/Swagger claims.

## Report format — answer every section

### 1. Project structure
Folder tree with a one-line note per top-level folder.

### 2. Every implemented endpoint (grep routers, don't trust Swagger)
For each route: method + path, handler file, request shape (body/params/query as used in code), response shape (as actually returned), DB reads/writes, middleware applied. Group by domain (Auth, Documents, Security, Reports, Chat, Admin, Settings, System).

Explicitly flag:
- Any route that's documented (Swagger, README, or any `.md` in the repo) but has no real handler, or the handler is a stub/mock.
- Any route that exists in code but isn't documented anywhere.
- Any route whose actual request/response shape differs from what's documented.

### 3. Document model — current real shape
Show the actual schema/type for a document record as persisted today. Confirm or correct against this expected shape (from prior planning — verify each field actually exists and is actually written to, not just declared in a type):
```
id, ownerId, fileName, fileSizeBytes, fileType, uploadUrl, uploadedAt,
scanStartedAt, scanFinishedAt, scanDurationMs,
currentStep, stepStatus,
layer1_ocrTextMatch { matchPercent, hiddenTextDetected, extraTextSegments, textDifferenceFound, differenceSnippet, ocrText, pdfTextLayer, status },
layer2_classification { label, confidence, accuracy, message, categories, requiresUserConfirmation },
layer3_llmReview { used, isMalicious, confidence, explanation, message, recommendedAction, attackVector, reasoning, mitigationSteps },
finalRiskScore, finalStatus, isContainInjection,
reviewedByUser, userReviewLabel
```
List which of these fields are real vs missing vs named differently in the actual code.

### 4. Upload/analysis pipeline — trace it end to end
- Is it still fully synchronous, or has async/background processing been added?
- Layer 1 (OCR/PDF compare): confirm still using tesseract.js + pdfjs-dist + pdf-img-convert, or changed.
- Layer 2: is this still `runMockLayer2Classifier`, or does it actually call out to FastAPI's `/classify` now? If it calls FastAPI, show the actual HTTP call code, the URL it uses (private network hostname vs public URL), and whether it sends `x-internal-token`/`x-internal-service` auth.
- Layer 3: is this still mocked, or does it actually call OpenAI now? If real, show: which model, whether `response_format: json_object` (or schema-constrained) is actually used, how `<untrusted_document_context>`-style sandboxing is implemented in the actual prompt-building code, and what happens if `OPENAI_API_KEY` is missing (confirm the claimed fallback-to-heuristic behavior is real).
- `isContainInjection`: is this actually derived from `finalStatus`/layer2/layer3 at response-build time, or is it a separately-set DB field that could drift out of sync?

### 5. Real-time/socket layer
- Confirm Socket.IO is now actually wired up (previous audit found it entirely absent).
- Show the actual `join_document` handler and room-scoping logic.
- Show the actual `scan_event` emit code for each of the 7 steps — confirm payload shape matches what's documented, confirm it's built from the same DB write (not a separately hand-maintained object).
- Confirm whether reconnect/resume works: if a client connects to `join_document` after the scan already finished, does it get anything, or does it need to fall back to `GET /api/documents/:id`?

### 6. Chat / AI Assistant
- Confirm `POST /api/chat/message` actually accepts `chatMode` and `screenDestination`, and show how (or whether) these actually change the system prompt or response constraints in code.
- Show the actual `AiMessageBlock` type used in code — compare against the reconciled union (header/text/callout/table/chart/list/image/code/quote/link/file) and flag any block type in code that isn't in that list, or vice versa.
- Confirm whether tool-calling/function-calling to fetch report data (e.g. risk summary) is implemented, or whether the AI still can't access live data.
- Confirm conversation history handling: full history sent every time, or a bounded window? Any rolling summary logic?

### 7. New/uncertain endpoints — confirm real or aspirational
For each of these, state clearly whether it has a real working handler or not:
- `POST /api/documents/:id/clean-injection`
- `PATCH /api/documents/:id/label-by-user`
- `GET /api/settings` / `PUT /api/settings` (and if real: what DB collection, user-scoped or global?)
- `POST /api/admin/models` (needed for the FastAPI training loop — confirm present or absent)

### 8. Removed/deprecated endpoints — confirm actually gone
- `GET /api/documents/:id/pipeline`
- `GET /api/documents/:id/scan-steps`
- `GET /api/security/interventions`
- `POST /api/analyze` (the legacy alias with the routing bug found previously — still present, fixed, or removed?)

### 9. Auth & service-to-service security
- Confirm current state of `requireAuth` (JWT + Firebase fallback + dev mock-admin fallback — still the same, or changed?)
- Confirm whether the FastAPI call now includes an internal-service token, and where that token is read from/validated.
- Confirm whether `FASTAPI_ANALYSIS_URL` now points to a private/internal hostname or still a public URL.

### 10. Environment/config
Grep all `process.env` usage, list every variable with a one-line purpose, flag any missing from `.env.example`. Specifically confirm presence of: `OPENAI_API_KEY`, `OPENAI_MODEL`, `FASTAPI_ANALYSIS_URL`, `INTERNAL_SERVICE_TOKEN` (or equivalent name actually used in code).

### 11. i18n / Accept-Language
Confirm whether response localization (az/en/ru/tr via `Accept-Language`) is actually implemented, and how (middleware, per-string lookup table, or something else). Note any endpoints that claim to support it but don't actually localize their response.

### 12. Dependencies
From `package.json`: confirm `socket.io` is now present, confirm no validation library was added (or was it?), confirm HTTP client used for the FastAPI call (native `fetch` vs `axios` vs other).

### 13. Your own assessment — gaps, bugs, inconsistencies
Plain bullet list, no fixes — just what you found broken, half-done, duplicated, or inconsistent with what the documentation claims.

## What NOT to do
Do not modify files. Do not fix anything. Do not guess — say "not implemented" or "could not confirm" rather than assuming.
