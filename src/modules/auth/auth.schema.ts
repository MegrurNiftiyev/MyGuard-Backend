export type UserRole = 'admin' | 'user' | 'analyst';
export type AuthProvider = 'local' | 'mygov' | 'sima';

export interface UserRecord {
  uid: string;
  fullName: string;
  finCode: string; // 7 characters, uppercase, primary unique ID
  email: string;   // lowercase, unique
  phone: string;   // e.g. "+994 50 123 45 67"
  passwordHash: string;
  role: UserRole;
  department: string;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  finCode: string;
  email: string;
  phone: string;
  role: UserRole;
  department: string;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface RegisterDto {
  fullName: string;
  finCode: string; // 7 chars, required
  email: string;   // required
  phone: string;   // required
  password: string;
  department?: string;
  role?: UserRole;
}

export interface LoginDto {
  finCode?: string; // primary identifier (or email)
  email?: string;
  password: string;
  rememberMe?: boolean;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface OAuthLoginDto {
  provider: 'mygov' | 'sima';
  finCode?: string;
  qrSessionId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: UserProfile;
}
