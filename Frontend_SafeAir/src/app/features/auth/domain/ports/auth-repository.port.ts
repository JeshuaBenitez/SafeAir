import { InjectionToken } from '@angular/core';

import { AuthCredentials } from '../models/auth-credentials.model';
import { LoginResult } from '../models/login-result.model';

export interface AuthRepositoryPort {
  login(credentials: AuthCredentials): Promise<LoginResult>;
}

export const AUTH_REPOSITORY = new InjectionToken<AuthRepositoryPort>('AUTH_REPOSITORY');
