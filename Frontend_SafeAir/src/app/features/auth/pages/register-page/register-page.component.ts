import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, RouterLink } from '@angular/router';

import { AuthFacade } from '@features/auth/application/facades/auth.facade';
import { RegisterFormComponent } from '@features/auth/components/register-form/register-form.component';
import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';

interface RegisterPageState {
  readonly loading: boolean;
  readonly feedback: string | null;
  readonly formError: string | null;
}

const initialState: RegisterPageState = {
  loading: false,
  feedback: null,
  formError: null,
};

@Component({
  selector: 'sa-register-page',
  standalone: true,
  imports: [NgIf, AsyncPipe, RouterLink, AuthShellComponent, AuthCardComponent, RegisterFormComponent],
  templateUrl: './register-page.component.html',
  styleUrl: './register-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPageComponent {
  private readonly stateSubject = new BehaviorSubject<RegisterPageState>(initialState);
  readonly state$ = this.stateSubject.asObservable();

  constructor(
    private readonly authFacade: AuthFacade,
    private readonly router: Router,
  ) {}

  onRegisterSubmit(draft: RegisterDraft): void {
    this.stateSubject.next({
      loading: true,
      feedback: null,
      formError: null,
    });

    this.authFacade
      .register(draft)
      .then((result) => {
        if (result.ok) {
          this.stateSubject.next({
            loading: false,
            feedback: '¡Cuenta creada con éxito! Redirigiendo al inicio de sesión...',
            formError: null,
          });

          setTimeout(() => {
            this.router.navigateByUrl('/auth/login');
          }, 2000);
        } else {
          this.stateSubject.next({
            loading: false,
            feedback: null,
            formError: result.error || 'No se pudo crear la cuenta. Intenta de nuevo.',
          });
        }
      })
      .catch((error: unknown) => {
        console.error('Registration failed unexpectedly', error);
        this.stateSubject.next({
          loading: false,
          feedback: null,
          formError: 'Ocurrió un error inesperado al registrar.',
        });
      });
  }
}
