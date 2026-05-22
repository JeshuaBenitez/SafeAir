export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'TEMPORARY_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR';

export interface AuthError {
  readonly code: AuthErrorCode;
  readonly message: string;
  readonly recoverable: boolean;
}
