import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { AuthError } from '@features/auth/domain/models/auth-error.model';
import { AuthSession } from '@features/auth/domain/models/auth-session.model';

import { LoginRequestDto } from '../dto/login-request.dto';
import { LoginResponseDto } from '../dto/login-response.dto';

export const toLoginRequestDto = (credentials: AuthCredentials): LoginRequestDto => ({
  email: credentials.email.trim().toLowerCase(),
  password: credentials.password,
});

export const toAuthSession = (response: LoginResponseDto): AuthSession => ({
  authenticated: true,
  userId: response.userId,
  displayName: response.displayName,
  tokenType: 'Bearer',
  accessToken: response.accessToken,
  expiresAt: response.expiresAt,
  email: response.email,
});

export const invalidCredentialsError = (): AuthError => ({
  code: 'INVALID_CREDENTIALS',
  message: 'Credenciales incorrectas. Intenta nuevamente.',
  recoverable: true,
});

export const temporaryUnavailableError = (): AuthError => ({
  code: 'TEMPORARY_UNAVAILABLE',
  message: 'Servicio no disponible temporalmente. Reintenta en unos minutos.',
  recoverable: true,
});

export const networkError = (): AuthError => ({
  code: 'NETWORK_ERROR',
  message: 'Error de conexión. Verifica tu conexión a internet e intenta nuevamente.',
  recoverable: true,
});
