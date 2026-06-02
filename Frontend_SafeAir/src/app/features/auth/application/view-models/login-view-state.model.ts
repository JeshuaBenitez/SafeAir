import { AuthError } from '@features/auth/domain/models/auth-error.model';
import { AuthSession } from '@features/auth/domain/models/auth-session.model';

export interface LoginViewState {
  readonly loading: boolean;
  readonly error: AuthError | null;
  readonly session: AuthSession | null;
  readonly requiresOtp?: boolean;
  readonly email?: string | null;
}

export const initialLoginViewState: LoginViewState = {
  loading: false,
  error: null,
  session: null,
  requiresOtp: false,
  email: null,
};
