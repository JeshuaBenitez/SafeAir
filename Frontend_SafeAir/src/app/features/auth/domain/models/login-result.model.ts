import { AuthError } from './auth-error.model';
import { AuthSession } from './auth-session.model';

export type LoginResult =
  | {
      readonly ok: true;
      readonly session: AuthSession;
    }
  | {
      readonly ok: false;
      readonly error: AuthError;
    };
