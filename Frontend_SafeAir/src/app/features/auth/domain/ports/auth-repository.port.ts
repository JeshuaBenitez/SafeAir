import { InjectionToken } from '@angular/core';

import { AuthCredentials } from '../models/auth-credentials.model';
import { LoginResult } from '../models/login-result.model';
import { RegisterDraft } from '../models/register-draft.model';
import { AuthError } from '../models/auth-error.model';

export interface AuthRepositoryPort {
  login(credentials: AuthCredentials): Promise<LoginResult>;
  register(draft: RegisterDraft): Promise<{ ok: boolean; error?: AuthError }>;
  verifyOtp(email: string, code: string): Promise<LoginResult>;
  resendOtp(email: string): Promise<{ ok: boolean; error?: AuthError }>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepositoryPort>('AUTH_REPOSITORY');
