import { AuthRepositoryPort } from '@features/auth/domain/ports/auth-repository.port';
import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { LoginResult } from '@features/auth/domain/models/login-result.model';
import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { AuthError } from '@features/auth/domain/models/auth-error.model';
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
      const loginRequest = toLoginRequestDto(credentials);

      const response = await this.apiClient.post<any, any>(
        '/api/v1/auth/login',
        loginRequest
      );

      if (response.data && response.data.requiresOtp) {
        console.debug('[Auth] OTP Verification required for email', response.data.email);
        return {
          ok: true,
          requiresOtp: true,
          email: response.data.email,
        };
      }

      const session = toAuthSession(response.data);

      console.debug('[Auth] Login successful', { userId: session.userId });

      return {
        ok: true,
        session,
        requiresOtp: false,
      };
    } catch (error) {
      return this.handleLoginError(error);
    }
  }

  async verifyOtp(email: string, code: string): Promise<LoginResult> {
    try {
      const response = await this.apiClient.post<any, any>(
        '/api/v1/auth/verify-otp',
        { email, code }
      );

      const session = toAuthSession(response.data);

      console.debug('[Auth] OTP Verification successful', { userId: session.userId });

      return {
        ok: true,
        session,
        requiresOtp: false,
      };
    } catch (error) {
      return this.handleLoginError(error);
    }
  }

  async resendOtp(email: string): Promise<{ ok: boolean; error?: AuthError }> {
    try {
      await this.apiClient.post<any, any>(
        '/api/v1/auth/resend-otp',
        { email }
      );

      console.debug('[Auth] OTP resend successful', { email });

      return {
        ok: true,
      };
    } catch (error) {
      return this.handleRegisterError(error);
    }
  }

  /**
   * Register a new user account
   * 
   * @param draft - User registration draft data
   * @returns Promise with ok and optional error
   */
  async register(draft: RegisterDraft): Promise<{ ok: boolean; error?: AuthError }> {
    try {
      await this.apiClient.post<any, any>(
        '/api/v1/auth/register',
        {
          firstName: draft.fullName,
          lastName: draft.lastName,
          email: draft.email,
          password: draft.password,
          confirmPassword: draft.confirmPassword,
        }
      );

      console.debug('[Auth] Registration successful', { email: draft.email });

      return {
        ok: true,
      };
    } catch (error) {
      return this.handleRegisterError(error);
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

  /**
   * Map API errors to domain registration errors
   * 
   * @param error - Error from API client
   * @returns Registration error result
   */
  private handleRegisterError(error: any): { ok: boolean; error: AuthError } {
    if (error instanceof Object && 'status' in error) {
      const apiError = error as ApiClientError;

      console.error('[Auth] Register error', apiError);

      if (apiError.status === 409) {
        return {
          ok: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'El correo electronico ya esta registrado.',
            recoverable: true,
          },
        };
      }

      if (apiError.status >= 400) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: apiError.error?.message || 'Error de validacion al registrar.',
            recoverable: true,
          },
        };
      }
    }

    return {
      ok: false,
      error: networkError(),
    };
  }
}
