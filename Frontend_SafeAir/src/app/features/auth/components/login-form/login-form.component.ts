import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthCredentials } from '@features/auth/domain/models/auth-credentials.model';
import { AuthError } from '@features/auth/domain/models/auth-error.model';
import { AuthLinkComponent } from '@shared/ui/form-button/auth-link.component';
import { PrimaryButtonComponent } from '@shared/ui/form-button/primary-button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { focusFirstInvalidControl } from '@shared/utils/a11y-focus.utils';
import { emailLikeValidator, minTrimmedLengthValidator } from '@shared/validators/auth-form.validators';

type LoginFormShape = {
  email: FormControl<string>;
  password: FormControl<string>;
};

@Component({
  selector: 'sa-login-form',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    FormInputComponent,
    PrimaryButtonComponent,
    AuthLinkComponent,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginFormComponent implements OnChanges {
  @Input() loading = false;
  @Input() error: AuthError | null = null;

  @Output() submitCredentials = new EventEmitter<AuthCredentials>();

  showPassword = false;

  readonly form = new FormGroup<LoginFormShape>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, emailLikeValidator()],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, minTrimmedLengthValidator(8)],
    }),
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ('loading' in changes) {
      if (this.loading) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    }
  }

  get emailControl(): FormControl<string> {
    return this.form.controls.email;
  }

  get passwordControl(): FormControl<string> {
    return this.form.controls.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalidControl();
      return;
    }

    this.submitCredentials.emit({
      email: this.emailControl.value.trim(),
      password: this.passwordControl.value,
    });
  }

  getEmailError(): string | undefined {
    if (!this.emailControl.touched && !this.emailControl.dirty) {
      return undefined;
    }

    if (this.emailControl.hasError('required')) {
      return 'Ingresa tu correo electronico.';
    }

    if (this.emailControl.hasError('emailLike')) {
      return 'El correo electronico no es valido.';
    }

    return undefined;
  }

  getPasswordError(): string | undefined {
    if (!this.passwordControl.touched && !this.passwordControl.dirty) {
      return undefined;
    }

    if (this.passwordControl.hasError('required')) {
      return 'Ingresa tu contrasena.';
    }

    if (this.passwordControl.hasError('minTrimmedLength')) {
      return 'La contrasena debe tener al menos 8 caracteres.';
    }

    return undefined;
  }
}