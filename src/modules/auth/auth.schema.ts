export type UserRole = 'admin' | 'user' | 'analyst';
export type AuthProvider = 'local';

export enum Department {
  IT_CYBERSECURITY = 'İnformasiya Texnologiyaları və Kibertəhlükəsizlik',
  FINANCE_ECONOMICS = 'Maliyyə və İqtisadiyyat',
  LEGAL_COMPLIANCE = 'Hüquq və Komplaens',
  HUMAN_RESOURCES = 'İnsan Resursları (HR)',
  OPERATIONS_LOGISTICS = 'Əməliyyatlar və Logistika',
  STRATEGIC_DEVELOPMENT = 'Strateji İnkişaf və Layihələr',
  GENERAL_CHANCELLERY = 'Ümumi Şöbə və Dəftərxana',
}

export const ALL_DEPARTMENTS = Object.values(Department);

export interface UserRecord {
  uid: string;
  fullName: string;
  finCode: string; // 7 characters, uppercase, primary unique ID
  email: string;   // lowercase, unique
  phone: string;   // e.g. "+994 50 123 45 67"
  passwordHash: string;
  role: UserRole;
  department: Department | string;
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
  department: Department;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface RegisterDto {
  fullName: string;
  finCode: string; // 7 chars, required
  email: string;   // required
  phone: string;   // required
  password: string;
  department: Department; // required enum
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

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: UserProfile;
}

