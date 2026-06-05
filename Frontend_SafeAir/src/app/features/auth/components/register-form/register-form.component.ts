import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { RegisterDraft } from '@features/auth/domain/models/register-draft.model';
import { AuthLinkComponent } from '@shared/ui/form-button/auth-link.component';
import { PrimaryButtonComponent } from '@shared/ui/form-button/primary-button.component';
import { FormInputComponent } from '@shared/ui/form-input/form-input.component';
import { focusFirstInvalidControl } from '@shared/utils/a11y-focus.utils';
import { emailLikeValidator, minTrimmedLengthValidator } from '@shared/validators/auth-form.validators';

type RegisterFormShape = {
  fullName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
};

const passwordMatchValidator = (control: AbstractControl): Record<string, true> | null => {
  const group = control as FormGroup<RegisterFormShape>;
  const password = group.controls.password.value;
  const confirm = group.controls.confirmPassword.value;

  if (!password || !confirm) {
    return null;
  }

  return password === confirm ? null : { passwordMismatch: true };
};

@Component({
  selector: 'sa-register-form',
  standalone: true,
  imports: [
    NgIf,
    ReactiveFormsModule,
    FormInputComponent,
    PrimaryButtonComponent,
    AuthLinkComponent,
  ],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterFormComponent {
  @Input() loading = false;
  @Input() formError?: string;
  @Input() submitLabel = 'CREAR CUENTA';

  @Output() submitRegister = new EventEmitter<RegisterDraft>();

  showPassword = false;
  showConfirmPassword = false;

  readonly form = new FormGroup<RegisterFormShape>(
    {
      fullName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, emailLikeValidator()],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, minTrimmedLengthValidator(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: [passwordMatchValidator] },
  );

  get fullNameControl(): FormControl<string> {
    return this.form.controls.fullName;
  }

  get lastNameControl(): FormControl<string> {
    return this.form.controls.lastName;
  }

  get emailControl(): FormControl<string> {
    return this.form.controls.email;
  }

  get passwordControl(): FormControl<string> {
    return this.form.controls.password;
  }

  get confirmPasswordControl(): FormControl<string> {
    return this.form.controls.confirmPassword;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      focusFirstInvalidControl();
      return;
    }

    this.submitRegister.emit({
      fullName: this.fullNameControl.value.trim(),
      lastName: this.lastNameControl.value.trim(),
      email: this.emailControl.value.trim().toLowerCase(),
      password: this.passwordControl.value,
      confirmPassword: this.confirmPasswordControl.value,
    });
  }

  getFullNameError(): string | undefined {
    return this.requiredError(this.fullNameControl, 'Ingresa tu nombre completo.');
  }

  getLastNameError(): string | undefined {
    return this.requiredError(this.lastNameControl, 'Ingresa tus apellidos.');
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
      return 'Ingresa una contrasena.';
    }

    if (this.passwordControl.hasError('minTrimmedLength')) {
      return 'La contrasena debe tener al menos 8 caracteres.';
    }

    return undefined;
  }

  getConfirmPasswordError(): string | undefined {
    if (
      !this.confirmPasswordControl.touched &&
      !this.confirmPasswordControl.dirty &&
      !this.form.hasError('passwordMismatch')
    ) {
      return undefined;
    }

    if (this.confirmPasswordControl.hasError('required')) {
      return 'Confirma tu contrasena.';
    }

    if (this.form.hasError('passwordMismatch')) {
      return 'Las contrasenas no coinciden.';
    }

    return undefined;
  }

  private requiredError(control: FormControl<string>, message: string): string | undefined {
    if (!control.touched && !control.dirty) {
      return undefined;
    }

    return control.hasError('required') ? message : undefined;
  }
}