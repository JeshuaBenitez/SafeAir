import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { LoginUseCase } from '@features/auth/domain/use-cases/login.use-case';
import { RegisterUseCase } from '@features/auth/domain/use-cases/register.use-case';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';
import { API_CLIENT } from '@core/config/api-client.token';
import { AUTH_REPOSITORY } from '@features/auth/domain/ports/auth-repository.port';
import { DashboardEnvironmentMockService } from '@features/dashboard/application/services/dashboard-environment-mock.service';
import { DashboardMockStateService } from '@features/dashboard/application/services/dashboard-mock-state.service';
import { environment } from '../../../../../environments/environment';

import { initialLoginViewState, LoginViewState } from '../view-models/login-view-state.model';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly loginViewStateSubject = new BehaviorSubject<LoginViewState>(initialLoginViewState);
  private readonly apiClient = inject(API_CLIENT);
  private readonly authRepository = inject(AUTH_REPOSITORY);

  readonly loginViewState$ = this.loginViewStateSubject.asObservable();

  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
    private readonly authSessionStorage: AuthSessionStorageService,
    private readonly dashboardMockState: DashboardMockStateService,
    private readonly dashboardEnvironmentState: DashboardEnvironmentMockService,
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
      requiresOtp: false,
      email: null,
    });
  }

  private syncUserProfile(session: any): void {
    if (!session) {
      return;
    }

    // Si no existen ya en localStorage, inicializarlos con los datos de la sesión de login
    const savedFirstName = localStorage.getItem('safeair.user.firstName');
    const savedLastName = localStorage.getItem('safeair.user.lastName');

    if (!savedFirstName || !savedLastName) {
      const parts = session.displayName.split(' ');
      const firstName = parts[0] || 'Admin';
      const lastName = parts.slice(1).join(' ') || 'SafeAir';

      localStorage.setItem('safeair.user.firstName', firstName);
      localStorage.setItem('safeair.user.lastName', lastName);
    }

    if (session.email) {
      localStorage.setItem('safeair.user.email', session.email);
    }
  }

  async login(credentials: AuthCredentials): Promise<boolean> {
    this.loginViewStateSubject.next({
      ...this.loginViewStateSubject.value,
      loading: true,
      error: null,
    });

    const result = await this.loginUseCase.execute(credentials);

    if (result.ok) {
      if (result.requiresOtp) {
        this.loginViewStateSubject.next({
          loading: false,
          error: null,
          session: null,
          requiresOtp: true,
          email: result.email,
        });
        return false;
      }

      if (environment.features.jwtInterceptor) {
        this.apiClient.setAuthToken(result.session.accessToken);
      }

      this.resetSessionDerivedStateIfUserChanged(result.session.userId);
      this.authSessionStorage.persistSession(result.session);
      this.syncUserProfile(result.session);
      this.dashboardMockState.refreshRooms();

      this.loginViewStateSubject.next({
        loading: false,
        error: null,
        session: result.session,
        requiresOtp: false,
        email: null,
      });
      return true;
    }

    this.loginViewStateSubject.next({
      loading: false,
      error: result.error,
      session: null,
      requiresOtp: false,
      email: null,
    });

    return false;
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    this.loginViewStateSubject.next({
      ...this.loginViewStateSubject.value,
      loading: true,
      error: null,
    });

    const result = await this.authRepository.verifyOtp(email, code);

    if (result.ok && 'session' in result) {
      if (environment.features.jwtInterceptor) {
        this.apiClient.setAuthToken(result.session.accessToken);
      }

      this.resetSessionDerivedStateIfUserChanged(result.session.userId);
      this.authSessionStorage.persistSession(result.session);
      this.syncUserProfile(result.session);
      this.dashboardMockState.refreshRooms();

      this.loginViewStateSubject.next({
        loading: false,
        error: null,
        session: result.session,
        requiresOtp: false,
        email: null,
      });
      return true;
    }

    this.loginViewStateSubject.next({
      ...this.loginViewStateSubject.value,
      loading: false,
      error: !result.ok ? result.error : { code: 'INVALID_OTP', message: 'Error de verificación', recoverable: true },
    });

    return false;
  }

  async resendOtp(email: string): Promise<boolean> {
    const result = await this.authRepository.resendOtp(email);
    return result.ok;
  }

  cancelOtp(): void {
    this.loginViewStateSubject.next(initialLoginViewState);
  }

  async register(draft: RegisterDraft): Promise<{ ok: boolean; error?: string }> {
    const result = await this.registerUseCase.execute(draft);
    if (result.ok) {
      // Guardar de inmediato en localStorage para que el perfil sea 100% persistente y correcto tras registrarse
      localStorage.setItem('safeair.user.firstName', draft.fullName);
      localStorage.setItem('safeair.user.lastName', draft.lastName);
      localStorage.setItem('safeair.user.email', draft.email);
      return { ok: true };
    }
    return {
      ok: false,
      error: result.error?.message || 'Error al crear la cuenta',
    };
  }

  logout(): void {
    this.authSessionStorage.clearSession();
    this.resetDashboardState();

    // Limpiar también los datos del perfil local para que el siguiente usuario empiece limpio
    localStorage.removeItem('safeair.user.firstName');
    localStorage.removeItem('safeair.user.lastName');
    localStorage.removeItem('safeair.user.email');
    localStorage.removeItem('safeair.user.profileImage');

    if (environment.features.jwtInterceptor) {
      this.apiClient.setAuthToken(null);
    }

    this.loginViewStateSubject.next(initialLoginViewState);
  }

  private resetSessionDerivedStateIfUserChanged(nextUserId: string): void {
    const currentSession = this.authSessionStorage.getSession();
    if (currentSession?.userId !== nextUserId) {
      this.resetDashboardState();
      localStorage.removeItem('safeair.user.firstName');
      localStorage.removeItem('safeair.user.lastName');
      localStorage.removeItem('safeair.user.email');
      localStorage.removeItem('safeair.user.profileImage');
    }
  }

  private resetDashboardState(): void {
    this.dashboardMockState.resetState();
    this.dashboardEnvironmentState.resetState();
  }
}
