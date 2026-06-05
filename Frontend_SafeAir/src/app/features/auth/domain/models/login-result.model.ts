import { AuthError } from './auth-error.model';
import { AuthSession } from './auth-session.model';

export type LoginResult =
  | {
      readonly ok: true;
      readonly session: AuthSession;
      readonly requiresOtp?: false;
    }
  | {
      readonly ok: true;
      readonly requiresOtp: true;
      readonly email: string;
    }
  | {
      readonly ok: false;
      readonly error: AuthError;
    };
