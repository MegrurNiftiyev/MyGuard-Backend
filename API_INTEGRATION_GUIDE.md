# 🌐 MyGuard — Complete Web Frontend API Integration Guide

Bu sənəd **MyGuard Web Frontend** tətbiqinin bütün səhifələrini (`Auth / Login / Register / SSO`, `Dashboard`, `Scan`, `Documents`, `Detailed Analysis`, `OCR ↔ PDF Comparison`, `Risk Reports`, `Action Security / Interventions`, `Model Management`, `AI Assistant / Chat`, `Settings`) **Backend REST API** ilə 100% inteqrasiya etmək üçün hazırlanmış hərtərəfli bələdçidir.

---

## 📌 1. Əsas Konfiqurasiya və Şərtlər

- **Base Server URL:** `http://localhost:3001`
- **Swagger Interactive UI:** `http://localhost:3001/api-docs`
- **Autentifikasiya:** Bütün qorunan sorğularda `Authorization: Bearer <Access_Token>` göndərilir.
- **Standart Başlıqlar:**
  ```http
  Accept: application/json
  Authorization: Bearer <token>
  ```

---

## 🔐 2. Autentifikasiya və İstifadəçi İdarəetməsi (`/api/auth`)

Frontend UI formalarına (Daxil ol / Qeydiyyat) tam uyğun olaraq:
- **Əsas İdentifikator:** **FİN KOD** (7 simvol, unikal).
- **Təkrarlanma qadağandır:** Nə **FİN Kod**, nə də **E-poçt** sistemdə təkrar oluna bilməz (409 Duplicate Error).
- **Telefon Nömrəsi:** Qeydiyyat zamanı məcburi sahədir (`phone`).
- **OAuth / SSO:** **myGov** və **SİMA (QR Giriş)** dəstəklənir.

### 🔹 2.1 POST `/api/auth/register` (Qeydiyyat)
Yeni istifadəçi qeydiyyatı.
- **Request Body (JSON):**
```json
{
  "fullName": "Samir Əliyev",
  "finCode": "7AB1234",
  "email": "e.mammadov@soc.gov.az",
  "phone": "+994 50 123 45 67",
  "password": "Password123!",
  "department": "Təhlükəsizlik və İnformasiya İdarəsi"
}
```

- **Response JSON (201 Created):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "usr-1724500000",
    "fullName": "Samir Əliyev",
    "finCode": "7AB1234",
    "email": "e.mammadov@soc.gov.az",
    "phone": "+994 50 123 45 67",
    "role": "user",
    "department": "Təhlükəsizlik və İnformasiya İdarəsi",
    "authProvider": "local",
    "createdAt": "2026-08-24T17:30:00.000Z"
  }
}
```

---

### 🔹 2.2 POST `/api/auth/login` (Daxil ol)
FİN Kod (əsas) və ya E-poçt ilə daxil olmaq.
- **Request Body (JSON):**
```json
{
  "finCode": "7AB1234",
  "password": "Password123!",
  "rememberMe": true
}
```

- **Response JSON (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "usr-admin-001",
    "fullName": "Samir Əliyev",
    "finCode": "7AB1234",
    "email": "e.mammadov@soc.gov.az",
    "phone": "+994 50 123 45 67",
    "role": "admin",
    "department": "Təhlükəsizlik və İnformasiya İdarəsi",
    "authProvider": "local",
    "createdAt": "2026-08-24T17:30:00.000Z"
  }
}
```

---

### 🔹 2.3 POST `/api/auth/refresh` (Token Yenilənməsi)
Vaxtı bitmiş Access Token-i Refresh Token ilə yeniləmək.
- **Request Body (JSON):**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
- **Response JSON (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 🔹 2.4 POST `/api/auth/oauth/mygov` və `/api/auth/oauth/sima` (SSO / QR Giriş)
myGov və ya SİMA QR vasitəsilə sürətli giriş.
- **Request Body (JSON):**
```json
{
  "finCode": "7MYG123",
  "qrSessionId": "qr-sess-998877"
}
```
- **Response JSON (200 OK):**
```json
{
  "success": true,
  "token": "...",
  "refreshToken": "...",
  "user": {
    "uid": "usr-mygov-1724500000",
    "fullName": "myGov Doğrulanmış İstifadəçi",
    "finCode": "7MYG123",
    "email": "7myg123@mygov.gov.az",
    "phone": "+994 50 000 00 00",
    "role": "user",
    "department": "Dövlət Portalı (SSO)",
    "authProvider": "mygov",
    "createdAt": "2026-08-24T17:30:00.000Z"
  }
}
```

---

### 🔹 2.5 GET `/api/auth/profile` və `/api/auth/me` (Profil)
Cari istifadəçi məlumatlarını almaq (Header-də `Authorization: Bearer <token>` tələb olunur).

---

## 🗺️ 3. Səhifələr və Backend Endpoint Xəritəsi

| Web Səhifəsi / Modul | Lazım olan Endpointlər | Əlaqəli Tip / İnterfeys |
| :--- | :--- | :--- |
| **1. Daxil ol / Qeydiyyat** | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`POST /api/auth/oauth/mygov`<br>`POST /api/auth/oauth/sima` | `AuthResponse`, `UserProfile` |
| **2. Dashboard & Analytics** | `GET /api/reports/risk-summary`<br>`GET /api/documents` | `RiskReportMetrics`, `DocumentItem[]` |
| **3. Scan & Upload Page** | `POST /api/documents/upload`<br>`GET /api/documents/:id/scan-steps`<br>`GET /api/documents/:id/pipeline` | `DocumentItem`, `ScanStep[]`, `AnalysisPipeline` |
| **4. Documents List Page** | `GET /api/documents`<br>`DELETE /api/documents/:id` | `DocumentItem[]` |
| **5. Analysis Result Page** | `GET /api/documents/:id` | `DetailedAnalysis`, `ThreatItem[]` |
| **6. Text Comparison Page** | `GET /api/documents/:id/comparison` | `DetailedAnalysis` (ocrText, pdfTextLayer) |
| **7. Risk Reports Page** | `GET /api/reports/risk-summary` | `RiskReportMetrics` |
| **8. Action Security Page** | `GET /api/security/actions`<br>`GET /api/security/interventions`<br>`PATCH /api/security/actions/:id/decision` | `AgentAction[]`, `Intervention[]` |
| **9. Model Management** | `GET /api/admin/models`<br>`POST /api/admin/models` | `ModelConfig[]` |
| **10. AI Assistant / Chat** | `POST /api/chat/session`<br>`GET /api/chat/history/:sessionId`<br>`POST /api/chat/message` | `ChatMessage[]`, `MessageBlock[]` |
| **11. User & Settings** | `GET /api/auth/profile` | `UserProfile` |

---

## 🤖 4. AI Assistant System Prompt & Dynamic Response Construction Guide

MyGuard AI modeli istifadəçiyə cavab verərkən bütün növ vizual blokları birlikdə kombinasiya edərək zəngin JSON cavabı qaytarır.

### 📜 Master AI System Prompt (LLM üçün Təlimat)

Aşağıdakı təlimat birbaşa `src/modules/chat/chat.prompt.ts` faylından götürülüb və LLM (Gemini, Claude, GPT) sorğularında `system_instruction` kimi istifadə olunmalıdır:

```text
Sən "MyGuard Document Security AI" - Korporativ Sənəd Təhlükəsizliyi, Prompt Injection Aşkarlama və Risk Analitika üzrə ixtisaslaşmış Baş AI Köməkçisisən.

==============================================
🎯 ƏSAS VƏZİFƏN VƏ DAVRANIŞ QAYDALARI:
==============================================
1. İstifadəçinin sənədlər, kibertəhlükəsizlik, prompt injection hücumları, OCR və PDF mətn fərqləri, həftəlik risk trendləri və təhlükəsizlik qaydaları ilə bağlı suallarına peşəkar, dəqiq və aydın cavab verirsən.
2. Bütün cavabların strukturlu və vizual cəhətdən zəngin olmalıdır. Cavabını YALNIZ aşağıda göstərilən JSON formatında qaytarmalısan. Heç bir əlavə markdown mətni (JSON-dan kənar) yazma.
3. İstifadəçinin sorğusuna uyğun olaraq istənilən blok növlərini bir yerdə kombinasiya edə bilərsən (məsələn: header + chart + table + callout + list + code + quote).

==============================================
📋 AI CAVABININ JSON STRUKTURU (JSON SCHEMA):
==============================================
{
  "text": "İstifadəçiyə qısa xülasə mətni",
  "structuredAnalysis": {
    "riskSeverity": "Təhlükə dərəcəsi (məs: 'Yüksək Risk (92/100)', 'Təhlükəsiz (12/100)')",
    "detectedThreat": "Aşkarlanan hücum növü (məs: 'Hidden Text & Instruction Override', 'None')",
    "confidence": "Etibarlılıq faizi (məs: '99.4%')",
    "reason": "Risk balının və ya təhlükənin ətraflı izahı",
    "recommendation": "Təhlükəsizlik üzrə konkret tövsiyə və tələb olunan addım"
  },
  "blocks": [
    // İstənilən sayda və kombinasiyada MessageBlock obyektləri
  ]
}

==============================================
🧱 DƏSTƏKLƏNƏN BÜTÜN BLOK NÖVLƏRİ (MESSAGE BLOCKS):
==============================================

1. 'header' - Bölmə başlığı və alt başlıq
2. 'text' - Sərbəst mətn mətni
3. 'chart' - Vizual qrafiklər ('area' | 'line' | 'bar' | 'horizontal_bar' | 'donut')
4. 'table' - Cədvəl görünüşü (headers və rows)
5. 'callout' - Xüsusi xəbərdarlıq ('danger' | 'warning' | 'success' | 'info' | 'purple')
6. 'list' - Nömrələnmiş və ya markerli tövsiyələr siyahısı ('numbered' | 'bullet')
7. 'code' - Kod və ya JSON nümayişi ('json' | 'typescript' | 'python' | 'bash' | 'sql' | 'yaml')
8. 'quote' - Sitat və ya rəsmi rəy (author, date, content)
9. 'image' - İnfrastruktur və ya arxitektura vizualı
10. 'link' - Kənar sənədləşmə və ya metodologiya linki
```

---

## 📡 5. Digər Endpoint Spesifikasiyaları

### 🔹 5.1 Sənədlər və Skan (`/api/documents`)
- `POST /api/documents/upload` - FormData (`document: File`)
- `GET /api/documents` - Bütün yüklənmiş sənədlər
- `GET /api/documents/:id` - Dərin analiz (`DetailedAnalysis`)
- `GET /api/documents/:id/scan-steps` - 7-Mərhələli real-time skan animasiya addımları
- `GET /api/documents/:id/pipeline` - Layer 1, Layer 2, Layer 3 statusu
- `GET /api/documents/:id/comparison` - OCR və PDF müqayisəsi
- `DELETE /api/documents/:id` - Sənədin silinməsi

### 🔹 5.2 Risk Hesabatları (`/api/reports`)
- `GET /api/reports/risk-summary` - Dashboard və Reports göstəriciləri (`RiskReportMetrics`)

### 🔹 5.3 Təhlükəsizlik Əməliyyatları (`/api/security`)
- `GET /api/security/actions` - Avtomatlaşdırılmış agent fəaliyyətləri (`AgentAction[]`)
- `GET /api/security/interventions` - Bloklanan/İcazə verilən əməliyyatlar
- `PATCH /api/security/actions/:id/decision` - Qərarın dəyişdirilməsi

### 🔹 5.4 Model İdarəetməsi (`/api/admin`)
- `GET /api/admin/models` - Aktiv müdafiə modelləri (`ModelConfig[]`)
- `POST /api/admin/models` - Yeni model əlavə etmək

### 🔹 5.5 AI Çat (`/api/chat`)
- `POST /api/chat/session` - Yeni sessiya açmaq
- `GET /api/chat/history/:sessionId` - Mesaj tarixçəsi
- `POST /api/chat/message` - Dinamik bloklu AI cavabı almaq

---

## 💻 6. Frontend Service Kodu (`src/api/authApi.ts` və `src/api/apiService.ts`)

```typescript
import { apiClient } from './client';

export const AuthAPI = {
  // Qeydiyyat
  register: (data: { fullName: string; finCode: string; email: string; phone: string; password: string }) => {
    return apiClient('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  },

  // Daxil ol
  login: (data: { finCode?: string; email?: string; password: string; rememberMe?: boolean }) => {
    return apiClient('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  },

  // Token yenilə
  refreshToken: (refreshToken: string) => {
    return apiClient('/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) });
  },

  // myGov QR Giriş
  loginMyGov: (finCode?: string, qrSessionId?: string) => {
    return apiClient('/auth/oauth/mygov', { method: 'POST', body: JSON.stringify({ finCode, qrSessionId }) });
  },

  // SİMA QR Giriş
  loginSima: (finCode?: string, qrSessionId?: string) => {
    return apiClient('/auth/oauth/sima', { method: 'POST', body: JSON.stringify({ finCode, qrSessionId }) });
  },

  // Cari Profil
  getProfile: () => {
    return apiClient('/auth/profile');
  },
};
```
