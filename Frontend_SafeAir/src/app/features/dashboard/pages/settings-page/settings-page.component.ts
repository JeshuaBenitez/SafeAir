import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';

@Component({
  selector: 'sa-settings-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    ReactiveFormsModule,
    DashboardSidebarComponent,
    DashboardTopbarComponent,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent implements OnDestroy {
  readonly defaultProfileImage = 'assets/images/userprofile.png';
  readonly viewModel$ = this.dashboardFacade.viewModel$;

  readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
    }),
  });

  profilePreviewUrl: string | null = null;
  saveMessage: string | null = null;
  saveError: string | null = null;

  showNewPassword = false;
  showConfirmPassword = false;

  private objectUrl: string | null = null;

  constructor(
    private readonly dashboardFacade: DashboardFacade,
    private readonly router: Router,
  ) {}

  get passwordsMismatch(): boolean {
    const newPassword = this.form.controls.newPassword.value;
    const confirmPassword = this.form.controls.confirmPassword.value;

    if (!newPassword && !confirmPassword) {
      return false;
    }

    return newPassword !== confirmPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.saveError = null;
    this.saveMessage = null;

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.saveError = 'Selecciona un archivo de imagen válido.';
      input.value = '';
      return;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = URL.createObjectURL(file);
    this.profilePreviewUrl = this.objectUrl;
  }

  onSave(): void {
    this.saveMessage = null;
    this.saveError = null;

    if (this.form.invalid) {
      this.saveError = 'Completa los campos requeridos correctamente.';
      this.form.markAllAsTouched();
      return;
    }

    if (this.passwordsMismatch) {
      this.saveError = 'Las contraseñas no coinciden.';
      return;
    }

    this.saveMessage = 'Cambios guardados localmente.';
  }

  onLogout(): void {
    void this.router.navigateByUrl('/auth/login');
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }
}