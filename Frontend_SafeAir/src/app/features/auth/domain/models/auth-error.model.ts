export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'TEMPORARY_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'EMAIL_ALREADY_EXISTS';

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
}
