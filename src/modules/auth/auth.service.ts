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
  OAuthLoginDto,
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
  department: 'Təhlükəsizlik və İnformasiya İdarəsi',
  authProvider: 'local',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
memoryUsers.set(defaultAdmin.uid, defaultAdmin);

function sanitizeProfile(user: UserRecord): UserProfile {
  return {
    uid: user.uid,
    fullName: user.fullName,
    finCode: user.finCode,
    email: user.email,
    phone: user.phone,
    role: user.role,
    department: user.department,
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

  // 7. Hash password
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
    department: dto.department || 'Dövlət / Korporativ İdarə',
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
 * SSO / OAuth login for myGov and SİMA QR
 */
export async function loginWithOAuth(dto: OAuthLoginDto): Promise<AuthResponse> {
  const finCode = (dto.finCode || '7GOV999').toUpperCase();
  let user = await findUserByFin(finCode);

  if (!user) {
    // Auto provision SSO user with unique FIN
    const uid = 'usr-' + dto.provider + '-' + Date.now();
    const now = new Date().toISOString();
    user = {
      uid,
      fullName: dto.fullName || (dto.provider === 'mygov' ? 'myGov İstifadəçisi' : 'SİMA İstifadəçisi'),
      finCode,
      email: dto.email || `${finCode.toLowerCase()}@${dto.provider}.gov.az`,
      phone: dto.phone || '+994 50 000 00 00',
      passwordHash: '',
      role: 'user',
      department: 'Dövlət Portalı (SSO)',
      authProvider: dto.provider,
      createdAt: now,
      updatedAt: now,
    };

    if (isFirebaseInitialized && db) {
      try {
        await db.collection(COLLECTIONS.USERS).doc(uid).set(user);
      } catch (err) {
        memoryUsers.set(uid, user);
      }
    } else {
      memoryUsers.set(uid, user);
    }
  }

  const { token, refreshToken } = generateTokens(user, false);

  return {
    success: true,
    token,
    refreshToken,
    user: sanitizeProfile(user),
  };
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
