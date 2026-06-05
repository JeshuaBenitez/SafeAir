import { Injectable } from '@angular/core';

import { AuthSession } from '@features/auth/domain/models/auth-session.model';
import { environment } from '../../../../../environments/environment';

const SESSION_STORAGE_KEY = 'safeair.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthSessionStorageService {
  private readonly isEnabled = environment.features.persistentSession;

  persistSession(session: AuthSession): void {
    if (!this.isEnabled) {
      return;
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  clearSession(): void {
    if (!this.isEnabled) {
      return;
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  hasActiveSession(): boolean {
    if (!this.isEnabled) {
      return false;
    }
    return this.getSession() !== null;
  }

  getSession(): AuthSession | null {
    if (!this.isEnabled) {
      return null;
    }
    const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawSession) {
      return null;
    }

    try {
      const parsed = JSON.parse(rawSession) as unknown;
      if (!isAuthSession(parsed)) {
        this.clearSession();
        return null;
      }

      if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
        this.clearSession();
        return null;
      }

      return parsed;
    } catch {
      this.clearSession();
      return null;
    }
  }
}

const isAuthSession = (value: unknown): value is AuthSession => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate['authenticated'] === true &&
    typeof candidate['userId'] === 'string' &&
    typeof candidate['displayName'] === 'string' &&
    candidate['tokenType'] === 'Bearer' &&
    typeof candidate['accessToken'] === 'string' &&
    typeof candidate['expiresAt'] === 'string'
  );
};
