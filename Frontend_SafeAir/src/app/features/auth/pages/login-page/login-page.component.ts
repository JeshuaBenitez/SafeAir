import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthFacade } from '@features/auth/application/facades/auth.facade';
import { AuthHeaderComponent } from '@features/auth/components/auth-header/auth-header.component';
import { LoginFormComponent } from '@features/auth/components/login-form/login-form.component';
import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';

@Component({
  selector: 'sa-login-page',
  standalone: true,
  imports: [AsyncPipe, NgIf, AuthShellComponent, AuthCardComponent, AuthHeaderComponent, LoginFormComponent],
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
}
