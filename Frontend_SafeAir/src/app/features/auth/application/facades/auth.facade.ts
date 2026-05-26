import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { LoginUseCase } from '@features/auth/domain/use-cases/login.use-case';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';
import { API_CLIENT } from '@core/config/api-client.token';
import { environment } from '../../../../../environments/environment';

import { initialLoginViewState, LoginViewState } from '../view-models/login-view-state.model';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly loginViewStateSubject = new BehaviorSubject<LoginViewState>(initialLoginViewState);
  private readonly apiClient = inject(API_CLIENT);

  readonly loginViewState$ = this.loginViewStateSubject.asObservable();

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly authSessionStorage: AuthSessionStorageService,
  ) {}

  hasActiveSession(): boolean {
    return this.authSessionStorage.hasActiveSession();
  }

  restoreSession(): void {
    if (!environment.features.persistentSession) {
      return;
    }

    const session = this.authSessionStorage.getSession();

    if (!session) {
      return;
    }

    if (environment.features.jwtInterceptor) {
      this.apiClient.setAuthToken(session.accessToken);
    }

    this.loginViewStateSubject.next({
      loading: false,
      error: null,
      session,
    });
  }

  async login(credentials: AuthCredentials): Promise<boolean> {
    this.loginViewStateSubject.next({
      ...this.loginViewStateSubject.value,
      loading: true,
      error: null,
    });

    const result = await this.loginUseCase.execute(credentials);

    if (result.ok) {
      if (environment.features.jwtInterceptor) {
        this.apiClient.setAuthToken(result.session.accessToken);
      }

      this.authSessionStorage.persistSession(result.session);
      this.loginViewStateSubject.next({
        loading: false,
        error: null,
        session: result.session,
      });
      return true;
    }

    this.loginViewStateSubject.next({
      loading: false,
      error: result.error,
      session: null,
    });

    return false;
  }

  logout(): void {
    this.authSessionStorage.clearSession();

    if (environment.features.jwtInterceptor) {
      this.apiClient.setAuthToken(null);
    }

    this.loginViewStateSubject.next(initialLoginViewState);
  }
}
