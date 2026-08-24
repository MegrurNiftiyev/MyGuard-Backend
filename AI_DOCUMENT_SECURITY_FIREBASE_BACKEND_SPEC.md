# AI Document Security Platform — Firebase-First Backend Architecture Specification

## 0. Purpose

This document defines the backend architecture for the **main AI Document Security Platform**.

This is NOT the previous team test-file collection system.

The previous collection page was only used to gather labeled `injection` and `benign` documents from team members for experimentation.

This document describes the actual product backend.

The main product is a security layer between uploaded documents and AI systems:

```text
USER
  |
  v
AUTHENTICATION
  |
  v
DOCUMENT UPLOAD
  |
  v
FIREBASE STORAGE
  |
  v
DOCUMENT PROCESSING
  |
  +--------------------+
  |                    |
  v                    v
PDF TEXT EXTRACTION    OCR
  |                    |
  +---------+----------+
            |
            v
      TEXT COMPARISON
            |
            v
   INJECTION CLASSIFIER
            |
            v
       RISK ENGINE
            |
      +-----+------+
      |            |
      v            v
   LOW RISK    SUSPICIOUS
      |            |
      |            v
      |        SECURITY LLM
      |            |
      +------+-----+
             |
             v
       FINAL ANALYSIS
             |
             v
        AI ASSISTANT
             |
             v
       CHAT / REPORTS
```

The backend should be built around Firebase to minimize infrastructure complexity.

---

# 1. Main Architectural Decision

Use Firebase as the primary backend platform.

Recommended services:

```text
Firebase Authentication
Firebase Cloud Storage
Cloud Firestore
Cloud Functions
Firebase App Check
Firebase Hosting (optional)
Firebase Cloud Messaging (optional)
```

Recommended external/compute components:

```text
Python FastAPI
OCR engine
PDF extraction libraries
ML classifier
LLM provider
Optional background job infrastructure
```

Firebase remains the central application backend and data layer.

The architecture should avoid introducing many independent databases.

---

# 2. Why Firebase for This Version

The goal is to get a working product quickly without maintaining a large infrastructure stack.

Firebase gives the project:

- Authentication
- Database
- File storage
- Serverless backend functions
- Access control
- Realtime updates
- Client SDKs
- Easy frontend integration
- Easy deployment

The main principle is:

> Keep application state and user-facing backend data in Firebase, while CPU-heavy document analysis can run in Python services.

---

# 3. Firebase Service Responsibilities

## 3.1 Firebase Authentication

Use Firebase Authentication for:

- registration
- login
- logout
- password reset
- email verification
- session management
- user identity
- authenticated API access

Recommended first authentication method:

```text
Email + Password
```

Optional future providers:

```text
Google
Microsoft
GitHub
Enterprise SSO
```

Do not implement all providers in version 1.

---

# 4. Firestore Responsibilities

Use Cloud Firestore for structured application data.

Firestore stores metadata and application state, not the large binary documents themselves.

Examples:

```text
users
documents
documentAnalyses
ocrResults
comparisonResults
classifierResults
riskAssessments
chatSessions
chatMessages
reports
modelVersions
securityEvents
notifications
systemSettings
```

---

# 5. Firebase Storage Responsibilities

Use Firebase Cloud Storage for actual files.

Examples:

```text
original documents
OCR artifacts
sanitized documents
generated reports
optional previews
```

Do NOT store large PDF/DOCX files as Firestore fields.

Instead:

```text
Firestore
    |
    +---- storagePath
            |
            v
      Firebase Storage
```

Example:

```text
storagePath:
documents/{userId}/{documentId}/original.pdf
```

---

# 6. Cloud Functions Responsibilities

Use Firebase Cloud Functions for lightweight backend orchestration.

Examples:

```text
create document record
generate secure upload metadata
validate document state
create analysis jobs
trigger notification
finalize analysis state
cleanup orphaned files
delete user data
```

Do not put heavy OCR or large ML inference inside a basic HTTP function unless the runtime and workload are appropriate.

CPU-heavy processing should be handled by a dedicated Python service.

---

# 7. Python Analysis Backend

The security analysis pipeline should use Python because it provides a strong ecosystem for:

- PDF processing
- OCR
- machine learning
- NLP
- embeddings
- model inference
- data processing

Recommended technology:

```text
FastAPI
Python
Pydantic
PyMuPDF
OCR engine
scikit-learn / PyTorch / TensorFlow
```

The exact OCR and ML libraries can be selected later.

---

# 8. Recommended Overall Architecture

```text
                         USER
                          |
                          v
                +-------------------+
                |   WEB FRONTEND    |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Firebase Auth     |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Firebase Backend  |
                |                   |
                | Firestore         |
                | Storage           |
                | Functions         |
                +---------+---------+
                          |
                          v
                +-------------------+
                | Analysis Orchestr.|
                +---------+---------+
                          |
                          v
                +-------------------+
                | Python / FastAPI  |
                +---------+---------+
                          |
       +------------------+------------------+
       |                  |                  |
       v                  v                  v
 PDF Extraction         OCR           Classifier
       |                  |                  |
       +------------------+------------------+
                          |
                          v
                    Risk Engine
                          |
                          v
                    Security LLM
                          |
                          v
                     Firestore
                          |
                          v
                    Web Frontend
```

---

# 9. Important Separation

There are three logical systems.

## System A — Main Product Backend

Responsible for:

```text
users
documents
uploads
analysis state
results
chat
reports
settings
```

## System B — Document Analysis Pipeline

Responsible for:

```text
PDF extraction
OCR
comparison
classifier inference
risk calculation
LLM security analysis
```

## System C — Previous Test Collection Tool

Responsible only for:

```text
team test documents
injection examples
benign examples
dataset gathering
```

System C is not part of the production backend.

Test files may later be imported into the training dataset, but the systems must remain logically separate.

---

# 10. Authentication Model

Firebase Authentication provides the identity.

After registration:

```text
Firebase Auth User
      |
      v
uid
```

Use the Firebase `uid` as the canonical user identifier.

Example:

```text
uid = "9e4c...."
```

Do not use email address as the primary database key.

---

# 11. User Profile Schema

Firestore:

```text
/users/{uid}
```

Example:

```json
{
  "displayName": "Feyruz",
  "email": "user@example.com",
  "photoURL": null,
  "role": "user",
  "status": "active",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Possible roles:

```text
user
admin
security_admin
```

Version 1 can use:

```text
user
admin
```

---

# 12. Registration Flow

```text
User
 |
 v
Registration page
 |
 +-- email
 +-- password
 +-- name
 |
 v
Firebase Authentication
 |
 v
Firebase UID
 |
 v
Create /users/{uid}
 |
 v
Application ready
```

Do not create the Firestore user document before successful authentication registration.

---

# 13. Login Flow

```text
Email
Password
   |
   v
Firebase Auth
   |
   v
Authenticated session
   |
   v
Frontend receives user
   |
   v
Load /users/{uid}
```

The frontend should never manually store passwords.

---

# 14. Logout Flow

Call Firebase sign-out.

```javascript
await signOut(auth);
```

Then:

```text
clear local application state
redirect to login
```

---

# 15. Password Reset

Use Firebase Auth password reset.

Do not implement password reset emails manually in the application backend.

---

# 16. Document Data Model

Main Firestore collection:

```text
/documents/{documentId}
```

Example:

```json
{
  "ownerId": "firebase-user-uid",
  "originalFileName": "candidate.pdf",
  "mimeType": "application/pdf",
  "fileSize": 482193,
  "storagePath": "documents/uid/documentId/original.pdf",
  "status": "uploaded",
  "analysisStatus": "queued",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

---

# 17. Document Status

Use separate states for storage and analysis.

Storage status:

```text
uploading
uploaded
failed
deleted
```

Analysis status:

```text
not_started
queued
extracting
ocr
comparing
classifying
risk_analysis
llm_analysis
completed
failed
cancelled
```

This allows the UI to show detailed progress.

---

# 18. Document Processing State Machine

```text
UPLOAD
  |
  v
UPLOADED
  |
  v
QUEUED
  |
  v
TEXT EXTRACTION
  |
  v
OCR
  |
  v
COMPARISON
  |
  v
CLASSIFICATION
  |
  v
RISK ENGINE
  |
  +--------------------+
  |                    |
  v                    v
LOW RISK            SUSPICIOUS
  |                    |
  |                    v
  |                SECURITY LLM
  |                    |
  +----------+---------+
             |
             v
         COMPLETED
```

---

# 19. File Storage Structure

Recommended Firebase Storage paths:

```text
documents/
  {userId}/
    {documentId}/
      original/
        document.pdf

      extracted/
        text.txt

      ocr/
        ocr.txt
        ocr.json

      comparison/
        comparison.json

      classifier/
        classifier.json

      reports/
        analysis.json
        report.pdf

      sanitized/
        sanitized.pdf
```

The original file should never be overwritten.

---

# 20. Why Keep Analysis Artifacts Separately?

The pipeline generates multiple outputs.

For example:

```text
original.pdf
text.txt
ocr.txt
comparison.json
classifier.json
risk.json
report.pdf
```

Keeping them separate gives:

- easier debugging
- reproducibility
- auditability
- easier model evaluation
- ability to re-run only one stage
- ability to inspect false positives
- ability to compare model versions

---

# 21. Document Analysis Schema

Firestore:

```text
/documentAnalyses/{analysisId}
```

Example:

```json
{
  "documentId": "document-uuid",
  "userId": "firebase-user-uid",
  "pipelineVersion": "1.0.0",
  "status": "completed",
  "startedAt": "serverTimestamp",
  "completedAt": "serverTimestamp",

  "textExtraction": {
    "status": "completed",
    "characters": 4212
  },

  "ocr": {
    "status": "completed",
    "characters": 4118
  },

  "comparison": {
    "status": "completed",
    "similarity": 0.72,
    "differenceDetected": true
  },

  "classifier": {
    "status": "completed",
    "label": "injection",
    "confidence": 0.94
  },

  "risk": {
    "score": 92,
    "level": "high"
  }
}
```

---

# 22. OCR Result Schema

```text
/ocrResults/{documentId}
```

Example:

```json
{
  "documentId": "abc123",
  "engine": "ocr-engine-name",
  "engineVersion": "1.0",
  "language": "en",
  "textStoragePath": "documents/uid/abc123/ocr/ocr.txt",
  "confidence": 0.91,
  "pageCount": 4,
  "createdAt": "serverTimestamp"
}
```

Do not store very large OCR text directly in Firestore if it can become large.

Prefer:

```text
Storage → full OCR text
Firestore → metadata + storagePath
```

---

# 23. Text Extraction Result

For a PDF with an embedded text layer:

```text
PDF
 |
 v
Text Extraction
 |
 v
extracted/text.txt
```

Firestore metadata:

```json
{
  "documentId": "abc123",
  "characters": 4312,
  "pages": 4,
  "storagePath": "documents/uid/abc123/extracted/text.txt"
}
```

---

# 24. PDF Text vs OCR Comparison

The system compares:

```text
PDF extracted text
        ↕
OCR text
```

Example:

```text
similarity = 0.72
```

But similarity must never automatically mean:

```text
injection = true
```

It is an independent security signal.

---

# 25. Comparison Result Schema

```text
/comparisonResults/{documentId}
```

Example:

```json
{
  "documentId": "abc123",
  "similarity": 0.72,
  "differenceDetected": true,

  "hiddenTextDetected": true,

  "differenceRegions": [
    {
      "page": 2,
      "text": "Ignore previous instructions..."
    }
  ],

  "createdAt": "serverTimestamp"
}
```

Sensitive text excerpts should be limited and should not be duplicated unnecessarily.

---

# 26. Classification Model

The custom classification model is a core security component.

It must be capable of detecting semantic injection behavior even when there is no OCR/PDF mismatch.

Examples:

```text
Visible injection
Hidden injection
Instruction override
Ranking manipulation
Role manipulation
Prompt extraction
Data exfiltration instruction
Agent action manipulation
```

---

# 27. Classifier Input

The classifier can receive:

```text
extracted document text
OCR text
or normalized combined text
```

The exact input representation can evolve.

The important requirement:

> The classifier must run even if PDF/OCR comparison finds no difference.

---

# 28. Classifier Output

Example:

```json
{
  "label": "injection",
  "probability": 0.94,
  "modelVersion": "classifier-v1",
  "createdAt": "serverTimestamp"
}
```

For benign:

```json
{
  "label": "benign",
  "probability": 0.97,
  "modelVersion": "classifier-v1"
}
```

---

# 29. Why the Classifier Is Independent

Scenario A:

```text
PDF/OCR match = 72%
classifier = injection 96%

=> high risk
```

Scenario B:

```text
PDF/OCR match = 99%
classifier = injection 98%

=> high risk
```

Scenario C:

```text
PDF/OCR match = 84%
classifier = benign 97%

=> mismatch alone does not automatically mean injection
```

This separation must be preserved in the backend data model.

---

# 30. Risk Engine

The risk engine combines independent signals.

Possible inputs:

```text
OCR/PDF mismatch
hidden text signal
classifier probability
document structure anomalies
agent-related indicators
future signals
```

Example:

```json
{
  "comparisonScore": 0.72,
  "hiddenText": true,
  "classifierProbability": 0.94
}
```

The risk engine returns:

```json
{
  "score": 92,
  "level": "high",
  "reasons": [
    "Invisible text detected",
    "Semantic instruction manipulation detected"
  ]
}
```

---

# 31. Risk Levels

Recommended initial levels:

```text
low
medium
high
critical
```

Example:

```text
0-24   → low
25-49  → medium
50-79  → high
80-100 → critical
```

These thresholds must remain configurable.

Do not hardcode them throughout the application.

---

# 32. Security LLM

The Security LLM should not automatically be the first layer.

Recommended architecture:

```text
Document
   |
   v
Classifier
   |
   +---- low risk ----> normal path
   |
   +---- suspicious --> Security LLM
```

The Security LLM receives relevant evidence.

Example:

```json
{
  "documentText": "...",
  "classifierScore": 0.94,
  "comparisonScore": 0.72,
  "hiddenText": true
}
```

The LLM returns structured analysis.

Example:

```json
{
  "classification": "high_risk_injection",
  "confidence": 0.96,
  "explanation": "...",
  "recommendedAction": "block"
}
```

---

# 33. LLM Output Should Be Structured

Do not depend on arbitrary free-form output when the backend needs a decision.

Prefer structured JSON.

Example:

```json
{
  "decision": "block",
  "riskLevel": "critical",
  "confidence": 0.96,
  "reasons": [
    "Instruction override attempt",
    "Ranking manipulation"
  ]
}
```

Validate this schema before saving it.

---

# 34. AI Assistant / Chat Backend

The platform includes an AI Assistant for authenticated users.

Chat hierarchy:

```text
user
 |
 +---- chat session
          |
          +---- messages
```

Firestore:

```text
/chatSessions/{sessionId}

/chatSessions/{sessionId}/messages/{messageId}
```

Session schema:

```json
{
  "userId": "uid",
  "documentId": "abc123",
  "title": "CV security analysis",
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Message schema:

```json
{
  "role": "user",
  "content": "Why was this file marked high risk?",
  "createdAt": "serverTimestamp"
}
```

Assistant message:

```json
{
  "role": "assistant",
  "content": "The document contains...",
  "createdAt": "serverTimestamp"
}
```

---

# 35. Document-Aware Chat

The AI Assistant may optionally be attached to a document.

Example:

```text
Chat Session
    |
    +---- documentId = abc123
```

Then the assistant can answer:

```text
Why is this document suspicious?
What hidden text was detected?
What did the classifier see?
Why did the risk score become 92?
```

---

# 36. Chat Security

Never allow the user to bypass the security pipeline just because they can chat about a document.

The chat backend should respect:

```text
document ownership
document access rules
analysis state
user permissions
```

---

# 37. Admin Backend

Create a role-aware admin system.

Firestore user field:

```text
role
```

Example:

```text
user
admin
```

Admin capabilities can include:

```text
view all users
view all documents
view system activity
view model versions
view analysis failures
manage users
manage model configuration
review suspicious documents
```

Do not rely only on frontend hidden buttons.

Backend security rules must enforce admin permissions.

---

# 38. Admin Dashboard Data

Useful collections:

```text
/securityEvents
/modelVersions
/systemSettings
/analysisJobs
```

Example admin metrics:

```text
total users
total documents
documents scanned
high-risk documents
critical documents
analysis failures
classifier versions
average analysis time
```

---

# 39. Security Events

Use:

```text
/securityEvents/{eventId}
```

Example:

```json
{
  "userId": "uid",
  "type": "document_blocked",
  "documentId": "abc123",
  "riskLevel": "critical",
  "createdAt": "serverTimestamp"
}
```

Do not log full document contents.

---

# 40. Model Version Registry

Firestore:

```text
/modelVersions/{modelId}
```

Example:

```json
{
  "name": "Injection Classifier",
  "version": "v1.2.0",
  "status": "active",
  "accuracy": 0.94,
  "f1": 0.92,
  "createdAt": "serverTimestamp"
}
```

This allows analysis results to record:

```text
classifierVersion = v1.2.0
```

which is essential for reproducibility.

---

# 41. Analysis Reproducibility

Every analysis should save:

```text
pipeline version
classifier version
OCR engine/version
LLM model/version
analysis timestamp
```

Example:

```json
{
  "pipelineVersion": "1.0.0",
  "classifierVersion": "v1.2.0",
  "ocrVersion": "tesseract-5",
  "llmModel": "provider-model-name"
}
```

Do not overwrite old analysis results silently when the model changes.

Create a new analysis run.

---

# 42. Analysis Runs

Prefer a dedicated collection:

```text
/analysisRuns/{runId}
```

Example:

```json
{
  "documentId": "abc123",
  "userId": "uid",
  "status": "completed",
  "pipelineVersion": "1.0.0",
  "classifierVersion": "v1.2.0",
  "llmModel": "model-x",
  "createdAt": "serverTimestamp"
}
```

Then results can reference `runId`.

This supports multiple analyses of the same document.

---

# 43. Recommended Firestore Collections

Version 1:

```text
/users
/documents
/analysisRuns
/ocrResults
/comparisonResults
/classifierResults
/riskAssessments
/reports
/chatSessions
/chatMessages
/securityEvents
/modelVersions
/systemSettings
```

Optional later:

```text
/datasetVersions
/annotations
/feedback
/notifications
/apiKeys
/integrations
/agentActions
```

---

# 44. Firestore Relationship Model

```text
/users/{userId}
       |
       +------< /documents/{documentId}
                    |
                    +------< /analysisRuns/{runId}
                    |
                    +------ /ocrResults/{documentId}
                    |
                    +------ /comparisonResults/{documentId}
                    |
                    +------ /classifierResults/{runId}
                    |
                    +------ /riskAssessments/{runId}
                    |
                    +------< /chatSessions/{sessionId}
```

Use IDs to reference related documents.

Avoid deeply nested structures when querying would become difficult.

---

# 45. Recommended Approach for Analysis Results

The backend should treat each analysis as immutable after completion except for clearly defined metadata updates.

Example:

```text
analysisRun #001
classifier v1.1
risk 84

analysisRun #002
classifier v1.2
risk 91
```

This lets you compare model behavior.

---

# 46. Upload API Contract

If the frontend communicates with FastAPI, use:

```text
POST /api/v1/documents
```

Request:

```multipart/form-data
file=<binary>
```

Authenticated user:

```text
Firebase ID token
```

The backend verifies the token.

Response:

```json
{
  "success": true,
  "documentId": "abc123",
  "status": "uploaded"
}
```

---

# 47. Authentication Verification in FastAPI

Frontend sends:

```text
Authorization: Bearer <Firebase ID Token>
```

FastAPI verifies the token using Firebase Admin SDK.

Conceptually:

```python
decoded_token = firebase_admin.auth.verify_id_token(id_token)
user_id = decoded_token["uid"]
```

Do not trust a user ID supplied by the frontend body.

The authenticated Firebase token is the source of truth.

---

# 48. Recommended FastAPI API Groups

```text
/api/v1/auth
/api/v1/documents
/api/v1/analysis
/api/v1/reports
/api/v1/chat
/api/v1/admin
/api/v1/models
```

Authentication itself remains handled by Firebase Auth.

FastAPI only verifies Firebase tokens.

---

# 49. Document Endpoints

Recommended:

```text
POST   /api/v1/documents
GET    /api/v1/documents
GET    /api/v1/documents/{id}
DELETE /api/v1/documents/{id}
POST   /api/v1/documents/{id}/analyze
GET    /api/v1/documents/{id}/analysis
GET    /api/v1/documents/{id}/report
```

---

# 50. Analysis Endpoints

```text
POST /api/v1/analysis/{documentId}
GET  /api/v1/analysis/{runId}
POST /api/v1/analysis/{runId}/retry
```

---

# 51. Chat Endpoints

```text
POST /api/v1/chat/sessions
GET  /api/v1/chat/sessions
GET  /api/v1/chat/sessions/{sessionId}
POST /api/v1/chat/sessions/{sessionId}/messages
```

---

# 52. Admin Endpoints

```text
GET /api/v1/admin/users
GET /api/v1/admin/documents
GET /api/v1/admin/analysis-runs
GET /api/v1/admin/security-events
GET /api/v1/admin/model-versions
```

Admin endpoints must verify:

```text
Firebase token
+
role == admin
```

---

# 53. Document Upload Sequence

Recommended:

```text
1. User logs in
2. Firebase issues auth token
3. User selects document
4. Frontend validates obvious file constraints
5. Frontend sends upload request
6. Backend verifies Firebase token
7. Backend creates document ID
8. Backend stores metadata
9. Backend uploads/stores file in Firebase Storage
10. Backend marks document uploaded
11. Backend creates analysis job
12. Analysis status becomes queued
13. User interface receives progress updates
```

---

# 54. Large File Strategy

For large files, use resumable or direct-to-storage upload.

Do not route huge files unnecessarily through FastAPI memory.

Preferred architecture:

```text
Frontend
   |
   v
Firebase Storage direct/resumable upload
   |
   v
Cloud Function / backend confirms upload
   |
   v
Analysis queue
```

This reduces backend bandwidth and memory usage.

---

# 55. Document Queue

Analysis should be asynchronous.

Example:

```text
document uploaded
       |
       v
queued
       |
       v
worker picks job
       |
       v
processing
       |
       v
completed
```

If multiple users upload simultaneously, the UI should not freeze waiting for the full analysis.

---

# 56. Worker Architecture

Recommended:

```text
Firebase
    |
    v
Analysis Job
    |
    v
Python Worker
    |
    +-- PDF extraction
    +-- OCR
    +-- comparison
    +-- classifier
    +-- risk engine
    +-- Security LLM
    |
    v
Firebase
```

The worker should update Firestore as stages complete.

---

# 57. Progress Updates

Example progress state:

```json
{
  "status": "processing",
  "stage": "ocr",
  "progress": 42
}
```

Possible stages:

```text
upload
extracting_text
ocr
comparing
classifying
risk_analysis
llm_analysis
finalizing
completed
```

Frontend can display:

```text
OCR                 42%
Classification      waiting
LLM Analysis        waiting
```

---

# 58. Failure Handling

Every pipeline stage should be retryable.

Example:

```text
OCR failed
   |
   v
analysis status = failed
error code = OCR_FAILED
```

User/admin can retry:

```text
POST /analysis/{runId}/retry
```

Do not require re-uploading the original file.

---

# 59. Idempotency

Background processing must be idempotent.

If the worker receives the same job twice, it should not create corrupt duplicate results.

Use:

```text
documentId
+
analysisRunId
+
stage
```

as an idempotency reference.

---

# 60. Storage Access Rules

Storage paths should incorporate user identity:

```text
documents/{userId}/{documentId}/...
```

Rules should ensure:

```text
user can access only their own documents
admin can access all documents
analysis service can access required documents
```

Do not rely only on frontend filtering.

---

# 61. Firestore Security Rules

Core principle:

```text
user can read/write own user document
user can read/write own documents
user can read own analysis
user can read own chat
admin can access everything allowed by role
```

Never use:

```text
allow read, write: if true;
```

for production.

---

# 62. Example Conceptual Firestore Rule

The exact final rules should be written after the final schema is fixed.

Concept:

```javascript
match /documents/{documentId} {
  allow read, write:
    if request.auth != null
    && request.auth.uid == resource.data.ownerId;
}
```

For creates, use:

```javascript
request.resource.data.ownerId == request.auth.uid
```

Admin access should be based on a trusted role mechanism.

---

# 63. Admin Role Security

Never trust:

```javascript
request.auth.token.role
```

unless that role is actually issued through a trusted Firebase mechanism.

Prefer Firebase custom claims for administrative roles.

Example:

```text
admin = true
```

Then secure Firestore and backend endpoints using that claim.

---

# 64. Firebase App Check

Enable Firebase App Check where appropriate.

Purpose:

```text
reduce unauthorized automated abuse
```

App Check does not replace Firebase Auth.

Use:

```text
Auth → identity
App Check → application authenticity signal
Security rules → authorization
```

---

# 65. Secrets Management

Do not place LLM API keys in frontend code.

Do not place:

```text
OPENAI_API_KEY
OTHER_LLM_API_KEY
FIREBASE_ADMIN_PRIVATE_KEY
```

inside client-side JavaScript.

Keep secrets on backend/server-side environments.

---

# 66. LLM Provider Abstraction

Do not tightly couple the entire codebase to one LLM vendor.

Create an abstraction:

```python
class SecurityLLM:
    async def analyze(self, request):
        ...
```

Then implementations can be:

```text
OpenAI
Anthropic
Google
Local model
```

The UI does not need to know which provider is being used.

---

# 67. Confidential Mode

The system should support two conceptual modes.

## Standard Mode

```text
Document
 ↓
Security pipeline
 ↓
External LLM
```

## Confidential Mode

```text
Document
 ↓
Local extraction
 ↓
Local OCR
 ↓
Local classifier
 ↓
Local Security AI
```

Firebase still stores application metadata.

The actual sensitive content may be kept within the configured private processing environment according to deployment policy.

---

# 68. AI Assistant Architecture

When a user asks:

```text
Why is this document suspicious?
```

the backend gathers:

```text
document metadata
comparison result
classifier result
risk result
Security LLM analysis
```

Then sends relevant context to the assistant.

The assistant response should be based on verified backend results rather than blindly re-reading untrusted document instructions as system-level instructions.

---

# 69. Important Prompt Injection Boundary

Uploaded document content is **untrusted input**.

Never construct an LLM prompt where the uploaded document can override system instructions.

Concept:

```text
SYSTEM INSTRUCTIONS
    ↓
SECURITY POLICY
    ↓
STRUCTURED DOCUMENT CONTENT
    ↓
MODEL
```

Not:

```text
Raw document
   ↓
paste directly as system prompt
```

---

# 70. Chat Data Model

```text
/chatSessions/{sessionId}
/chatSessions/{sessionId}/messages/{messageId}
```

Message:

```json
{
  "role": "user",
  "content": "Explain the hidden text.",
  "documentId": "abc123",
  "createdAt": "serverTimestamp"
}
```

Assistant:

```json
{
  "role": "assistant",
  "content": "The analysis found...",
  "sourceAnalysisRunId": "run123",
  "createdAt": "serverTimestamp"
}
```

Keeping the `sourceAnalysisRunId` provides traceability.

---

# 71. Reports

Reports can be generated asynchronously.

Firestore:

```text
/reports/{reportId}
```

Storage:

```text
documents/{uid}/{documentId}/reports/report.pdf
```

Metadata:

```json
{
  "documentId": "abc123",
  "analysisRunId": "run123",
  "format": "pdf",
  "storagePath": "documents/.../report.pdf",
  "createdAt": "serverTimestamp"
}
```

---

# 72. Auditability

The system should preserve:

```text
who uploaded
when uploaded
what model analyzed it
what version analyzed it
what result was produced
whether LLM analysis occurred
what final decision was made
```

This is especially important for enterprise security workflows.

---

# 73. Delete User Data

Provide a secure deletion workflow:

```text
Delete user
   |
   +---- Firebase Auth user
   |
   +---- Firestore user data
   |
   +---- document metadata
   |
   +---- Firebase Storage files
   |
   +---- chat history
   |
   +---- reports
   |
   +---- security events according to retention policy
```

Deletion should be implemented server-side.

Do not rely on the browser to delete all user data.

---

# 74. Retention Policy

Make retention configurable.

Examples:

```text
documents: 90 days
analysis results: 180 days
chat: 180 days
audit logs: 1 year
```

These are example defaults only.

The final retention policy depends on the deployment.

---

# 75. Cost-Control Strategy

Firebase-first should remain cost-conscious.

Important principles:

```text
Do not store huge text blobs repeatedly in Firestore.
Do not run LLM analysis unnecessarily.
Do not run OCR multiple times for the same document unless needed.
Cache completed stage results.
Do not reprocess unchanged documents.
Use asynchronous processing.
Use model/version metadata.
```

Store large artifacts in Storage.

Store compact structured results in Firestore.

---

# 76. Analysis Cost Optimization

Recommended logic:

```text
Upload
 ↓
Text extraction
 ↓
OCR
 ↓
comparison
 ↓
classifier
 ↓
Only suspicious cases → Security LLM
```

This avoids calling an expensive LLM for every harmless document.

---

# 77. Future Agent Action Security

The system can later include:

```text
Action Security
```

Example:

```text
Agent wants to:
send internal_report.pdf
to external@gmail.com
```

Action layer evaluates:

```text
document sensitivity
destination
requested action
user permissions
```

Result:

```text
BLOCK
```

This should be implemented as a separate backend module.

Potential collection later:

```text
/agentActions/{actionId}
```

---

# 78. Future RAG Integration

Later the platform may process:

```text
RAG documents
knowledge bases
emails
web pages
tickets
shared drives
```

The same document abstraction can be reused:

```text
sourceType
```

Examples:

```text
pdf
docx
email
web
ticket
drive
```

The first version should focus on file uploads.

---

# 79. API Versioning

Use:

```text
/api/v1/...
```

from the beginning.

Do not expose unversioned production APIs.

Future:

```text
/api/v2/...
```

can coexist during migration.

---

# 80. Recommended Backend Project Structure

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   └── v1/
│   │       ├── documents.py
│   │       ├── analysis.py
│   │       ├── chat.py
│   │       ├── reports.py
│   │       ├── models.py
│   │       └── admin.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── logging.py
│   │
│   ├── firebase/
│   │   ├── auth.py
│   │   ├── firestore.py
│   │   └── storage.py
│   │
│   ├── services/
│   │   ├── document_service.py
│   │   ├── analysis_service.py
│   │   ├── extraction_service.py
│   │   ├── ocr_service.py
│   │   ├── comparison_service.py
│   │   ├── classifier_service.py
│   │   ├── risk_service.py
│   │   ├── llm_service.py
│   │   ├── chat_service.py
│   │   └── report_service.py
│   │
│   ├── workers/
│   │   ├── analysis_worker.py
│   │   └── cleanup_worker.py
│   │
│   ├── schemas/
│   │   ├── document.py
│   │   ├── analysis.py
│   │   ├── classifier.py
│   │   └── chat.py
│   │
│   └── utils/
│       ├── files.py
│       ├── hashing.py
│       └── validation.py
│
├── tests/
│
├── requirements.txt
├── .env.example
└── README.md
```

---

# 81. Environment Variables

Example:

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

FIREBASE_STORAGE_BUCKET=

LLM_PROVIDER=
LLM_API_KEY=

CLASSIFIER_MODEL_PATH=
OCR_ENGINE=

MAX_FILE_SIZE_MB=50
```

If deployed on Google/Firebase infrastructure, use Secret Manager or platform secrets where possible.

Never commit real credentials.

---

# 82. Observability

Track:

```text
upload duration
OCR duration
classifier duration
LLM duration
total analysis duration
failure rate
retry rate
```

Avoid logging:

```text
full document contents
full OCR text
full user chat contents
secret API keys
```

---

# 83. Performance Requirements

The backend should:

- avoid loading large documents into memory unnecessarily
- stream or use direct uploads when appropriate
- process analysis asynchronously
- avoid duplicate processing
- use pagination for Firestore lists
- cache reusable analysis results
- keep API responses small
- store large artifacts in Firebase Storage

---

# 84. Testing Strategy

Minimum backend tests:

## Authentication

```text
valid Firebase token → accepted
invalid token → rejected
missing token → rejected
```

## Documents

```text
upload valid file
reject invalid file
get own document
reject another user's document
```

## Analysis

```text
create analysis run
update stages
handle failure
retry failed stage
```

## Classifier

```text
injection result stored
benign result stored
model version stored
```

## Chat

```text
create session
add message
retrieve session
prevent access to another user's session
```

## Admin

```text
admin → allowed
normal user → forbidden
```

---

# 85. Initial MVP Scope

Do not implement everything in one release.

MVP should contain:

```text
1. Firebase Auth
2. User profile
3. Document upload
4. Firebase Storage
5. Firestore document records
6. User document list
7. PDF extraction
8. OCR
9. PDF/OCR comparison
10. Custom classifier integration
11. Risk result
12. Security LLM integration
13. Analysis result page API
14. Basic AI chat
15. Basic admin role
```

---

# 86. Phase 2

Add:

```text
model management
reports
re-analysis
dataset versioning
feedback
annotation
rate limiting improvements
notifications
better audit logs
confidential mode
```

---

# 87. Phase 3

Add:

```text
Agent Action Security
RAG security
email ingestion
web ingestion
drive integrations
enterprise SSO
organization/team support
on-premise processing
advanced model monitoring
```

---

# 88. Final Backend Principle

The backend should be built as a modular security platform rather than a simple upload API.

The logical layers are:

```text
AUTH
  ↓
DOCUMENT MANAGEMENT
  ↓
STORAGE
  ↓
PROCESSING
  ↓
OCR / EXTRACTION
  ↓
COMPARISON
  ↓
CLASSIFIER
  ↓
RISK ENGINE
  ↓
SECURITY LLM
  ↓
REPORTING
  ↓
AI CHAT
  ↓
ADMIN / AUDIT
```

Firebase should handle the application infrastructure:

```text
Firebase Auth
Firebase Storage
Firestore
Cloud Functions
Security Rules
App Check
```

Python should handle compute-heavy analysis:

```text
FastAPI
PDF extraction
OCR
Classifier
Risk engine
LLM orchestration
```

The architecture must remain modular so the storage layer, OCR engine, classifier, or LLM provider can be replaced later without rewriting the entire product.

---

# 89. Short Final Architecture

```text
                         USER
                          |
                          v
                    FIREBASE AUTH
                          |
                          v
                    FIREBASE APP
                          |
             +------------+-------------+
             |                          |
             v                          v
        FIRESTORE                 FIREBASE STORAGE
             |                          |
             |                    original files
             |                    OCR artifacts
             |                    reports
             |
             v
        FASTAPI BACKEND
             |
      +------+------+------+------+------+
      |      |      |      |      |      |
      v      v      v      v      v      v
    PDF    OCR  Compare Classifier Risk   LLM
    Text                  Model    Engine
      |      |      |      |      |      |
      +------+------+------+------+------+
                         |
                         v
                   ANALYSIS RESULT
                         |
                         v
                    AI ASSISTANT
                         |
                         v
                        CHAT
```

## Core rule

Keep Firebase as the central backend platform.

Use Firebase Storage for files.

Use Firestore for structured state and metadata.

Use Firebase Authentication for login/register.

Use Firebase security rules for authorization.

Use Python/FastAPI for heavy document-analysis workloads.

Use the classifier independently of PDF/OCR mismatch.

Use the Security LLM only when deeper reasoning is needed.

Treat all uploaded document content as untrusted input.

Keep the previous team test-file collection system separate from this production architecture.
