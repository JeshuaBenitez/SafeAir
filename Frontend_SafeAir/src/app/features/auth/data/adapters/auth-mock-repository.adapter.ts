import { AuthRepositoryPort } from '@features/auth/domain/ports/auth-repository.port';
import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { LoginResult } from '@features/auth/domain/models/login-result.model';
import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { AuthError } from '@features/auth/domain/models/auth-error.model';

import {
  invalidCredentialsError,
  toAuthSession,
  toLoginRequestDto,
} from '../mappers/auth-login.mapper';

const SIMULATED_DELAY_MS = 900;

export class AuthMockRepositoryAdapter implements AuthRepositoryPort {
  async login(credentials: AuthCredentials): Promise<LoginResult> {
    const request = toLoginRequestDto(credentials);

    await new Promise((resolve) => {
      setTimeout(resolve, SIMULATED_DELAY_MS);
    });

    const isValidUser = request.email === 'admin@safeair.local' && request.password === '12345678';

    if (!isValidUser) {
      return {
        ok: false,
        error: invalidCredentialsError(),
      };
    }

    return {
      ok: true,
      session: toAuthSession({
        authenticated: true,
        userId: 'user-admin-01',
        displayName: 'Administrador SafeAir',
        tokenType: 'Bearer',
        accessToken: 'mock-access-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    };
  }

  async register(draft: RegisterDraft): Promise<{ ok: boolean; error?: AuthError }> {
    await new Promise((resolve) => {
      setTimeout(resolve, SIMULATED_DELAY_MS);
    });

    if (draft.email === 'error@safeair.local') {
      return {
        ok: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'El correo electronico ya esta registrado.',
          recoverable: true,
        },
      };
    }

    return {
      ok: true,
    };
  }

  async verifyOtp(email: string, code: string): Promise<LoginResult> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
    if (code !== '123456') {
      return {
        ok: false,
        error: {
          code: 'INVALID_OTP',
          message: 'Código de verificación incorrecto.',
          recoverable: true
        }
      };
    }
    return {
      ok: true,
      session: toAuthSession({
        authenticated: true,
        userId: 'user-admin-01',
        displayName: 'Administrador SafeAir',
        tokenType: 'Bearer',
        accessToken: 'mock-access-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    };
  }

  async resendOtp(email: string): Promise<{ ok: boolean; error?: AuthError }> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_DELAY_MS));
    return { ok: true };
  }
}
