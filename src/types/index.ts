import { Request } from 'express';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
