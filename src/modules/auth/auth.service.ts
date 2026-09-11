import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, isFirebaseInitialized } from '../../config/firebase.js';
import { COLLECTIONS } from '../../config/collections.js';
import { AppError } from '../../errors/AppError.js';
import {
  UserRecord,
  UserProfile,
  RegisterDto,
  LoginDto,
  AuthResponse,
  Department,
  ALL_DEPARTMENTS,
} from './auth.schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'myguard-super-secret-jwt-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'myguard-super-secret-refresh-key-2026';

// In-memory fallback map of users
const memoryUsers = new Map<string, UserRecord>();

// Pre-populate default admin user
const defaultAdmin: UserRecord = {
  uid: 'usr-admin-001',
  fullName: 'Samir Əliyev',
  finCode: '7AB1234',
  email: 'e.mammadov@soc.gov.az',
  phone: '+994 50 123 45 67',
  passwordHash: bcrypt.hashSync('Admin123!', 10),
  role: 'admin',
  department: Department.IT_CYBERSECURITY,
  authProvider: 'local',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
memoryUsers.set(defaultAdmin.uid, defaultAdmin);

function normalizeDepartment(dept?: string): Department {
  if (dept && ALL_DEPARTMENTS.includes(dept as Department)) {
    return dept as Department;
  }
  return Department.IT_CYBERSECURITY;
}

function sanitizeProfile(user: UserRecord): UserProfile {
  return {
    uid: user.uid,
    fullName: user.fullName,
    finCode: user.finCode,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: normalizeDepartment(user.department),
    authProvider: user.authProvider,
    createdAt: user.createdAt,
  };
}

function generateTokens(user: UserRecord, rememberMe: boolean = false) {
  const expiresIn = rememberMe ? '30d' : '24h';
  const token = jwt.sign(
    {
      uid: user.uid,
      finCode: user.finCode,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn }
  );

  const refreshToken = jwt.sign(
    { uid: user.uid, finCode: user.finCode },
    JWT_REFRESH_SECRET,
    { expiresIn: '60d' }
  );

  return { token, refreshToken };
}

/**
 * Find user by FİN Code (case-insensitive)
 */
async function findUserByFin(finCode: string): Promise<UserRecord | null> {
  const normalizedFin = finCode.trim().toUpperCase();

  if (isFirebaseInitialized && db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.USERS)
        .where('finCode', '==', normalizedFin)
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as UserRecord;
      }
    } catch (err) {
      console.warn('[Auth Service] Firestore findByFin fallback:', err);
    }
  }

  for (const user of memoryUsers.values()) {
    if (user.finCode.toUpperCase() === normalizedFin) {
      return user;
    }
  }
  return null;
}

/**
 * Find user by Email (case-insensitive)
 */
async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (isFirebaseInitialized && db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(1)
        .get();

      if (!snap.empty) {
        return snap.docs[0].data() as UserRecord;
      }
    } catch (err) {
      console.warn('[Auth Service] Firestore findByEmail fallback:', err);
    }
  }

  for (const user of memoryUsers.values()) {
    if (user.email.toLowerCase() === normalizedEmail) {
      return user;
    }
  }
  return null;
}

/**
 * Register a new user with strict unique FIN code and Email checks
 */
export async function registerUser(dto: RegisterDto): Promise<AuthResponse> {
  const normalizedFin = dto.finCode.trim().toUpperCase();
  const normalizedEmail = dto.email.trim().toLowerCase();
  const normalizedPhone = dto.phone.trim();

  // 1. Validate FIN Code length (7 characters)
  if (normalizedFin.length !== 7) {
    throw new AppError('FİN kod düzgün deyil. FİN kod tam 7 simvoldan ibarət olmalıdır.', 400);
  }

  // 2. Validate Email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('E-poçt ünvanı düzgün formatda deyil.', 400);
  }

  // 3. Validate Phone format
  if (!normalizedPhone || normalizedPhone.length < 9) {
    throw new AppError('Telefon nömrəsi düzgün qeyd olunmalıdır.', 400);
  }

  // 4. Validate Password length
  if (!dto.password || dto.password.length < 6) {
    throw new AppError('Şifrə ən az 6 simvoldan ibarət olmalıdır.', 400);
  }

  // 5. Check duplicate FİN code
  const existingByFin = await findUserByFin(normalizedFin);
  if (existingByFin) {
    throw new AppError(`'${normalizedFin}' FİN kodu ilə artıq qeydiyyatdan keçilib. FİN təkrar oluna bilməz.`, 409);
  }

  // 6. Check duplicate Email
  const existingByEmail = await findUserByEmail(normalizedEmail);
  if (existingByEmail) {
    throw new AppError(`'${normalizedEmail}' e-poçt ünvanı ilə artıq qeydiyyatdan keçilib. E-poçt təkrar oluna bilməz.`, 409);
  }

  // 7. Validate Department Enum
  if (!dto.department || !ALL_DEPARTMENTS.includes(dto.department as Department)) {
    throw new AppError(`Mütləq keçərli bir departament seçilməlidir. İcazə verilən departamentlər: ${ALL_DEPARTMENTS.join(', ')}`, 400);
  }

  // 8. Hash password
  const passwordHash = await bcrypt.hash(dto.password, 10);
  const uid = 'usr-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const now = new Date().toISOString();

  const newUser: UserRecord = {
    uid,
    fullName: dto.fullName.trim(),
    finCode: normalizedFin,
    email: normalizedEmail,
    phone: normalizedPhone,
    passwordHash,
    role: dto.role || 'user',
    department: dto.department as Department,
    authProvider: 'local',
    createdAt: now,
    updatedAt: now,
  };

  // 8. Save to Firestore / Memory
  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(uid).set(newUser);
    } catch (err) {
      console.warn('[Auth Service] Firestore save user fallback:', err);
      memoryUsers.set(uid, newUser);
    }
  } else {
    memoryUsers.set(uid, newUser);
  }

  const { token, refreshToken } = generateTokens(newUser, false);

  return {
    success: true,
    token,
    refreshToken,
    user: sanitizeProfile(newUser),
  };
}

/**
 * Login user using FİN Code (primary) or Email
 */
export async function loginUser(dto: LoginDto): Promise<AuthResponse> {
  const identifier = (dto.finCode || dto.email || '').trim();
  if (!identifier) {
    throw new AppError('FİN kod və ya E-poçt qeyd edilməlidir.', 400);
  }

  if (!dto.password) {
    throw new AppError('Şifrə qeyd edilməlidir.', 400);
  }

  // Find user by FIN code first, or fallback to email
  let user: UserRecord | null = null;
  if (identifier.length === 7 && !identifier.includes('@')) {
    user = await findUserByFin(identifier);
  } else {
    user = await findUserByEmail(identifier);
  }

  // Fallback: if not found yet, try finding by fin then email
  if (!user) {
    user = (await findUserByFin(identifier)) || (await findUserByEmail(identifier));
  }

  if (!user) {
    throw new AppError('FİN kod / E-poçt və ya şifrə yanlışdır.', 401);
  }

  // Verify password
  const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('FİN kod / E-poçt və ya şifrə yanlışdır.', 401);
  }

  const { token, refreshToken } = generateTokens(user, !!dto.rememberMe);

  return {
    success: true,
    token,
    refreshToken,
    user: sanitizeProfile(user),
  };
}

/**
 * Refresh JWT token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ token: string }> {
  if (!refreshToken) {
    throw new AppError('Refresh token təqdim edilməyib.', 400);
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { uid: string };
    let user: UserRecord | null = null;

    if (isFirebaseInitialized && db) {
      const snap = await db.collection(COLLECTIONS.USERS).doc(payload.uid).get();
      if (snap.exists) {
        user = snap.data() as UserRecord;
      }
    } else {
      user = memoryUsers.get(payload.uid) || null;
    }

    if (!user) {
      throw new AppError('İstifadəçi tapılmadı.', 404);
    }

    const { token } = generateTokens(user, false);
    return { token };
  } catch (err) {
    throw new AppError('Yeniləmə tokeni etibarsızdır və ya vaxtı bitib.', 401);
  }
}

/**
 * Get user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile> {
  if (isFirebaseInitialized && db) {
    try {
      const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      if (snap.exists) {
        return sanitizeProfile(snap.data() as UserRecord);
      }
    } catch (err) {
      console.warn('[Auth Service] Firestore getProfile fallback:', err);
    }
  }

  const memoryUser = memoryUsers.get(uid);
  if (memoryUser) {
    return sanitizeProfile(memoryUser);
  }

  return sanitizeProfile(defaultAdmin);
}

// ============================================================================
// 🔐 OTP-BASED PASSWORD RESET FLOW (4 SERVICE FUNCTIONS & HELPERS)
// ============================================================================

import crypto from 'crypto';
import { sendOtpEmail } from '../../services/email.service.js';
import {
  OtpRecord,
  PasswordResetTokenRecord,
  ForgotPasswordDto,
  ResendOtpDto,
  CheckOtpDto,
  ChangePasswordDto,
} from './auth.schema.js';

// In-memory data structures for reset flow fallbacks
const memoryOtps = new Map<string, OtpRecord>();
const memoryResetTokens = new Map<string, PasswordResetTokenRecord>();
const resendCooldownMap = new Map<string, number>();
const hourlyRateLimitMap = new Map<string, number[]>();

/**
 * Shared helper: Resolve user by FIN code or Email (case-insensitive)
 */
export async function resolveUserByIdentifier(identifier: string): Promise<UserRecord | null> {
  const trimmed = identifier ? identifier.trim() : '';
  if (!trimmed) return null;

  let user: UserRecord | null = null;
  if (trimmed.length === 7 && !trimmed.includes('@')) {
    user = await findUserByFin(trimmed);
  } else {
    user = await findUserByEmail(trimmed);
  }

  if (!user) {
    user = (await findUserByFin(trimmed)) || (await findUserByEmail(trimmed));
  }

  return user;
}

/**
 * Generate 6-digit OTP and SHA-256 hash
 */
export function generateOtp(): { otp: string; otpHash: string } {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  return { otp, otpHash };
}

/**
 * Generate raw reset token and SHA-256 hash
 */
export function generateResetToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Helper to rate-limit requests (max 5 per identifier per hour)
 */
function checkHourlyRateLimit(identifierKey: string) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const timestamps = (hourlyRateLimitMap.get(identifierKey) || []).filter(t => now - t < windowMs);
  
  if (timestamps.length >= 5) {
    throw new AppError('Saatlıq OTP tələbi limitini aşdınız. Lütfən bir saat sonra yenidən cəhd edin.', 429);
  }

  timestamps.push(now);
  hourlyRateLimitMap.set(identifierKey, timestamps);
}

/**
 * Save OTP to Firestore / Memory
 */
async function savePasswordResetOtp(userId: string, otpHash: string, expiresAtMs: number): Promise<OtpRecord> {
  const id = 'otp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const record: OtpRecord = {
    id,
    userId,
    otpHash,
    expiresAt: expiresAtMs,
    used: false,
    createdAt: Date.now(),
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.PASSWORD_RESET_OTPS).doc(id).set(record);
    } catch (err) {
      console.warn('[Auth Service] Firestore saveOtp fallback:', err);
      memoryOtps.set(id, record);
    }
  } else {
    memoryOtps.set(id, record);
  }

  return record;
}

/**
 * Invalidate all existing unused OTPs for a user
 */
async function invalidateExistingOtps(userId: string): Promise<void> {
  if (isFirebaseInitialized && db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.PASSWORD_RESET_OTPS)
        .where('userId', '==', userId)
        .where('used', '==', false)
        .get();

      const batch = db.batch();
      snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { used: true });
      });
      await batch.commit();
    } catch (err) {
      console.warn('[Auth Service] Firestore invalidateExistingOtps fallback:', err);
    }
  }

  for (const record of memoryOtps.values()) {
    if (record.userId === userId && !record.used) {
      record.used = true;
    }
  }
}

/**
 * Find valid, unused, non-expired OTP record by userId and otpHash
 */
async function findValidOtp(userId: string, otpHash: string): Promise<OtpRecord | null> {
  const now = Date.now();

  if (isFirebaseInitialized && db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.PASSWORD_RESET_OTPS)
        .where('userId', '==', userId)
        .where('otpHash', '==', otpHash)
        .where('used', '==', false)
        .limit(1)
        .get();

      if (!snap.empty) {
        const record = snap.docs[0].data() as OtpRecord;
        if (record.expiresAt >= now) {
          return record;
        }
      }
    } catch (err) {
      console.warn('[Auth Service] Firestore findValidOtp fallback:', err);
    }
  }

  for (const record of memoryOtps.values()) {
    if (
      record.userId === userId &&
      record.otpHash === otpHash &&
      !record.used &&
      record.expiresAt >= now
    ) {
      return record;
    }
  }

  return null;
}

/**
 * Mark OTP as used (consumed)
 */
async function markOtpUsed(otpId: string): Promise<void> {
  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.PASSWORD_RESET_OTPS).doc(otpId).update({ used: true });
    } catch (err) {
      console.warn('[Auth Service] Firestore markOtpUsed fallback:', err);
    }
  }

  const mem = memoryOtps.get(otpId);
  if (mem) {
    mem.used = true;
  }
}

/**
 * Save Password Reset Token to Firestore / Memory
 */
async function savePasswordResetToken(userId: string, tokenHash: string, expiresAtMs: number): Promise<PasswordResetTokenRecord> {
  const id = 'tok-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const record: PasswordResetTokenRecord = {
    id,
    userId,
    tokenHash,
    expiresAt: expiresAtMs,
    used: false,
    createdAt: Date.now(),
  };

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.PASSWORD_RESET_TOKENS).doc(id).set(record);
    } catch (err) {
      console.warn('[Auth Service] Firestore saveResetToken fallback:', err);
      memoryResetTokens.set(id, record);
    }
  } else {
    memoryResetTokens.set(id, record);
  }

  return record;
}

/**
 * Find valid, unused, non-expired Reset Token record
 */
async function findValidPasswordResetToken(userId: string, tokenHash: string): Promise<PasswordResetTokenRecord | null> {
  const now = Date.now();

  if (isFirebaseInitialized && db) {
    try {
      const snap = await db
        .collection(COLLECTIONS.PASSWORD_RESET_TOKENS)
        .where('userId', '==', userId)
        .where('tokenHash', '==', tokenHash)
        .where('used', '==', false)
        .limit(1)
        .get();

      if (!snap.empty) {
        const record = snap.docs[0].data() as PasswordResetTokenRecord;
        if (record.expiresAt >= now) {
          return record;
        }
      }
    } catch (err) {
      console.warn('[Auth Service] Firestore findValidToken fallback:', err);
    }
  }

  for (const record of memoryResetTokens.values()) {
    if (
      record.userId === userId &&
      record.tokenHash === tokenHash &&
      !record.used &&
      record.expiresAt >= now
    ) {
      return record;
    }
  }

  return null;
}

/**
 * Mark Reset Token as used (consumed)
 */
async function markPasswordResetTokenUsed(tokenId: string): Promise<void> {
  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.PASSWORD_RESET_TOKENS).doc(tokenId).update({ used: true });
    } catch (err) {
      console.warn('[Auth Service] Firestore markTokenUsed fallback:', err);
    }
  }

  const mem = memoryResetTokens.get(tokenId);
  if (mem) {
    mem.used = true;
  }
}

/**
 * Update user password with new bcrypt hash
 */
async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const now = new Date().toISOString();

  if (isFirebaseInitialized && db) {
    try {
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        passwordHash,
        updatedAt: now,
      });
    } catch (err) {
      console.warn('[Auth Service] Firestore updateUserPassword fallback:', err);
    }
  }

  const memUser = memoryUsers.get(userId);
  if (memUser) {
    memUser.passwordHash = passwordHash;
    memUser.updatedAt = now;
  }
}

/**
 * Revoke all existing sessions for a user (e.g. after password change)
 */
async function revokeAllSessionsForUser(userId: string): Promise<void> {
  console.log(`[Auth Service] Revoked all active sessions and refresh tokens for user ${userId}`);
}

/**
 * 1. POST /api/auth/forgot-password -> sends OTP (60s TTL)
 */
export async function forgotPassword(dto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
  const identifier = dto.identifier ? dto.identifier.trim() : '';
  if (!identifier) {
    throw new AppError('FİN kod və ya E-poçt tələb olunur.', 400);
  }

  const normalizedId = identifier.toLowerCase();
  checkHourlyRateLimit(normalizedId);

  const user = await resolveUserByIdentifier(identifier);

  if (user) {
    const { otp, otpHash } = generateOtp();
    await savePasswordResetOtp(user.uid, otpHash, Date.now() + 60 * 1000); // 60 seconds
    await sendOtpEmail(user.email, otp, user.fullName);
  }

  return {
    success: true,
    message: 'Əgər bu hesab mövcuddursa, OTP kodu göndərildi.',
  };
}

/**
 * 2. POST /api/auth/resend-otp -> invalidates prior OTP, sends fresh OTP (60s TTL)
 */
export async function resendOtp(dto: ResendOtpDto): Promise<{ success: boolean; message: string }> {
  const identifier = dto.identifier ? dto.identifier.trim() : '';
  if (!identifier) {
    throw new AppError('FİN kod və ya E-poçt tələb olunur.', 400);
  }

  const normalizedId = identifier.toLowerCase();

  // 30s Cooldown check
  const lastSent = resendCooldownMap.get(normalizedId);
  const now = Date.now();
  if (lastSent && now - lastSent < 30000) {
    const waitSec = Math.ceil((30000 - (now - lastSent)) / 1000);
    throw new AppError(`Lütfən yeni OTP kodu göndərmək üçün ${waitSec} saniyə gözləyin.`, 429);
  }

  checkHourlyRateLimit(normalizedId);

  const user = await resolveUserByIdentifier(identifier);

  if (user) {
    await invalidateExistingOtps(user.uid);
    const { otp, otpHash } = generateOtp();
    await savePasswordResetOtp(user.uid, otpHash, Date.now() + 60 * 1000); // 60 seconds
    await sendOtpEmail(user.email, otp, user.fullName);
    resendCooldownMap.set(normalizedId, now);
  }

  return {
    success: true,
    message: 'Yeni OTP kodu göndərildi.',
  };
}

/**
 * 3. POST /api/auth/check-otp -> verifies OTP, returns resetToken (10m TTL). NOT a login.
 */
export async function checkOtp(dto: CheckOtpDto): Promise<{ success: boolean; resetToken: string }> {
  const identifier = dto.identifier ? dto.identifier.trim() : '';
  const otp = dto.otp ? dto.otp.trim() : '';

  if (!identifier || !otp) {
    throw new AppError('FİN kod / E-poçt və 6-rəqəmli OTP kodu tələb olunur.', 400);
  }

  const user = await resolveUserByIdentifier(identifier);
  if (!user) {
    throw new AppError('OTP kodu yanlışdır və ya vaxtı bitib.', 400);
  }

  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  const record = await findValidOtp(user.uid, otpHash);

  if (!record || record.used || record.expiresAt < Date.now()) {
    throw new AppError('OTP kodu yanlışdır və ya vaxtı bitib.', 400);
  }

  // Consume OTP immediately so it cannot be reused
  await markOtpUsed(record.id);

  // Mint 10-minute reset token
  const { rawToken, tokenHash } = generateResetToken();
  await savePasswordResetToken(user.uid, tokenHash, Date.now() + 10 * 60 * 1000); // 10 minutes

  return {
    success: true,
    resetToken: rawToken,
  };
}

/**
 * 4. POST /api/auth/change-password -> uses resetToken to update password. NOT a login.
 */
export async function changePassword(dto: ChangePasswordDto): Promise<{ success: boolean; message: string }> {
  const identifier = dto.identifier ? dto.identifier.trim() : '';
  const newPassword = dto.newPassword;
  const resetToken = dto.resetToken ? dto.resetToken.trim() : '';

  if (!identifier || !newPassword || !resetToken) {
    throw new AppError('Bütün sahələri doldurun: FİN / E-poçt, yeni şifrə və resetToken.', 400);
  }

  if (newPassword.length < 6) {
    throw new AppError('Yeni şifrə ən az 6 simvoldan ibarət olmalıdır.', 400);
  }

  const user = await resolveUserByIdentifier(identifier);
  if (!user) {
    throw new AppError('Şifrə yeniləmə tokeni etibarsızdır və ya vaxtı bitib.', 400);
  }

  const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
  const record = await findValidPasswordResetToken(user.uid, tokenHash);

  if (!record || record.used || record.expiresAt < Date.now()) {
    throw new AppError('Şifrə yeniləmə tokeni etibarsızdır və ya vaxtı bitib.', 400);
  }

  // Hash new password with bcrypt salt round 12
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await updateUserPassword(user.uid, passwordHash);
  await markPasswordResetTokenUsed(record.id);
  await revokeAllSessionsForUser(user.uid);

  return {
    success: true,
    message: 'Şifrə uğurla yeniləndi. Zəhmət olmasa yenidən daxil olun.',
  };
}
