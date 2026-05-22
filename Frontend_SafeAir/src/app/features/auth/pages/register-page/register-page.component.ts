import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { RegisterFormComponent } from '@features/auth/components/register-form/register-form.component';
import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';
import { RouterLink } from '@angular/router';

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

  onRegisterSubmit(_draft: RegisterDraft): void {
    this.stateSubject.next({
      loading: true,
      feedback: null,
      formError: null,
    });

    setTimeout(() => {
      this.stateSubject.next({
        loading: false,
        feedback: 'Registro visual future-ready completo. La integracion real se habilitara en un siguiente lote.',
        formError: null,
      });
    }, 900);
  }
}
