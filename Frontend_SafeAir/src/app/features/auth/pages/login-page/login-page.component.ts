import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';

import { AuthFacade } from '@features/auth/application/facades/auth.facade';
import { AuthHeaderComponent } from '@features/auth/components/auth-header/auth-header.component';
import { LoginFormComponent } from '@features/auth/components/login-form/login-form.component';
import { OtpFormComponent } from '../../components/otp-form/otp-form.component';
import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';

@Component({
  selector: 'sa-login-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    AuthShellComponent,
    AuthCardComponent,
    AuthHeaderComponent,
    LoginFormComponent,
    OtpFormComponent,
  ],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPageComponent {
  readonly state$ = this.authFacade.loginViewState$;

  constructor(
    private readonly authFacade: AuthFacade,
    private readonly router: Router,
  ) {}

  onLogin(credentials: AuthCredentials): void {
    this.authFacade
      .login(credentials)
      .then((authenticated) => {
        if (authenticated) {
          return this.router.navigateByUrl('/dashboard');
        }
        return false;
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Login failed unexpectedly', error);
      });
  }

  async onVerifyOtp(code: string): Promise<void> {
    const state = await firstValueFrom(this.state$.pipe(take(1)));

    if (!state.email) {
      console.error('OTP verification failed: no email in state');
      return;
    }

    try {
      const success = await this.authFacade.verifyOtp(state.email, code);
      if (success) {
        await this.router.navigateByUrl('/dashboard');
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('OTP verification failed unexpectedly', error);
    }
  }

  async onResendOtp(): Promise<void> {
    const state = await firstValueFrom(this.state$.pipe(take(1)));

    if (!state.email) {
      return;
    }

    try {
      await this.authFacade.resendOtp(state.email);
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('OTP resend failed unexpectedly', error);
    }
  }

  onCancelOtp(): void {
    this.authFacade.cancelOtp();
  }
}
