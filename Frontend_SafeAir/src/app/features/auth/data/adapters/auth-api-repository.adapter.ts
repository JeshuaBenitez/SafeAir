import { AuthRepositoryPort } from '@features/auth/domain/ports/auth-repository.port';
import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { LoginResult } from '@features/auth/domain/models/login-result.model';
import { ApiClientPort, ApiClientError } from '@core/http/api-client.port';
import { LoginResponseDto } from '../dto/login-response.dto';

import {
  toLoginRequestDto,
  toAuthSession,
  invalidCredentialsError,
  temporaryUnavailableError,
  networkError,
} from '../mappers/auth-login.mapper';

/**
 * Authentication API Repository Adapter
 * 
 * Handles real HTTP communication with backend API for auth operations
 * Concrete implementation of AuthRepositoryPort
 */
export class AuthApiRepositoryAdapter implements AuthRepositoryPort {
  constructor(private readonly apiClient: ApiClientPort) {}

  /**
   * Login with email and password
   * 
   * Calls backend POST /api/v1/auth/login and maps response to AuthSession
   * 
   * @param credentials - User email and password
   * @returns LoginResult with session on success, error on failure
   */
  async login(credentials: AuthCredentials): Promise<LoginResult> {
    try {
      // Convert credentials to DTO (for mapping and validation)
      const loginRequest = toLoginRequestDto(credentials);

      // Call backend API
      const response = await this.apiClient.post<any, LoginResponseDto>(
        '/api/v1/auth/login',
        loginRequest
      );

      const session = toAuthSession(response.data);

      console.debug('[Auth] Login successful', { userId: session.userId });

      return {
        ok: true,
        session,
      };
    } catch (error) {
      return this.handleLoginError(error);
    }
  }

  /**
   * Map API errors to domain LoginResult errors
   * 
   * @param error - Error from API client
   * @returns LoginResult with appropriate error
   */
  private handleLoginError(error: any): LoginResult {
    if (error instanceof Object && 'status' in error) {
      const apiError = error as ApiClientError;

      console.error('[Auth] Login error', apiError);

      // HTTP 401: Invalid credentials
      if (apiError.status === 401) {
        return {
          ok: false,
          error: invalidCredentialsError(),
        };
      }

      // Other HTTP errors: temporary unavailability
      if (apiError.status >= 500) {
        return {
          ok: false,
          error: temporaryUnavailableError(),
        };
      }

      // Client errors (4xx): likely validation error
      if (apiError.status >= 400) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: apiError.error?.message || 'Validation error',
            recoverable: true,
          },
        };
      }
    }

    // Network errors or unknown
    console.error('[Auth] Unexpected login error', error);
    return {
      ok: false,
      error: networkError(),
    };
  }
}
