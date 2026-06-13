import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { AuthFacade } from '@features/auth/application/facades/auth.facade';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';
import { environment } from '../../../../../environments/environment';

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
export class SettingsPageComponent implements OnInit, OnDestroy {
  @ViewChild('jwtTextarea') private jwtTextarea?: ElementRef<HTMLTextAreaElement>;
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
  readonly showDevJwtTools = this.isLocalHost();
  devJwtToken = '';
  devJwtCopyMessage: string | null = null;

  showNewPassword = false;
  showConfirmPassword = false;

  private objectUrl: string | null = null;
  private tempBase64Image: string | null = null;

  constructor(
    private readonly dashboardFacade: DashboardFacade,
    private readonly authFacade: AuthFacade,
    private readonly authSessionStorage: AuthSessionStorageService,
    private readonly router: Router,
    private readonly changeDetectorRef: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const session = this.authSessionStorage.getSession();
    this.devJwtToken = session?.accessToken ?? '';

    // Cargar datos guardados de perfil en localStorage para persistencia real
    const savedFirstName = localStorage.getItem('safeair.user.firstName');
    const savedLastName = localStorage.getItem('safeair.user.lastName');
    const savedEmail = localStorage.getItem('safeair.user.email');
    const savedAvatar = localStorage.getItem('safeair.user.profileImage');

    let defaultFirstName = 'Admin';
    let defaultLastName = 'SafeAir';

    if (session?.displayName) {
      const parts = session.displayName.split(' ');
      defaultFirstName = parts[0] || 'Admin';
      defaultLastName = parts.slice(1).join(' ') || 'SafeAir';
    }

    this.form.patchValue({
      firstName: savedFirstName || defaultFirstName,
      lastName: savedLastName || defaultLastName,
      email: savedEmail || session?.email || (session?.userId ? `${session.userId.substring(0, 8)}@safeair.com` : 'admin@safeair.local'),
    });

    if (savedAvatar) {
      this.profilePreviewUrl = savedAvatar;
    } else {
      this.profilePreviewUrl = this.defaultProfileImage;
    }
  }

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

    // Convertir a Base64 para persistir la foto directamente en localStorage
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      this.profilePreviewUrl = base64;
      this.tempBase64Image = base64;
    };
    reader.readAsDataURL(file);
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

    const { firstName, lastName, email } = this.form.getRawValue();

    // Persistir campos de perfil en localStorage
    localStorage.setItem('safeair.user.firstName', firstName);
    localStorage.setItem('safeair.user.lastName', lastName);
    localStorage.setItem('safeair.user.email', email);

    if (this.tempBase64Image) {
      localStorage.setItem('safeair.user.profileImage', this.tempBase64Image);
    }

    // Actualizar nombre en la sesión activa si existe
    const session = this.authSessionStorage.getSession();
    if (session) {
      const updatedSession = {
        ...session,
        displayName: `${firstName} ${lastName}`,
      };
      this.authSessionStorage.persistSession(updatedSession);
      this.authFacade.restoreSession();
    }

    // Disparar recarga de datos en el Facade del Dashboard para refrescar la barra lateral de inmediato
    this.dashboardFacade.refreshRooms();

    this.saveMessage = '¡Cambios guardados con éxito y aplicados al perfil!';
  }

  onLogout(): void {
    this.authFacade.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  async onCopyJwt(): Promise<void> {
    if (!this.devJwtToken) {
      return;
    }

    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(this.devJwtToken);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      const textarea = this.jwtTextarea?.nativeElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
        try {
          copied = document.execCommand('copy');
        } catch {
          copied = false;
        }
      }
    }

    this.devJwtCopyMessage = copied
      ? 'JWT copiado al portapapeles.'
      : 'No se pudo copiar automáticamente. El token quedó seleccionado; cópialo manualmente.';
    this.changeDetectorRef.markForCheck();

    window.setTimeout(() => {
      this.devJwtCopyMessage = null;
      this.changeDetectorRef.markForCheck();
    }, 2500);
  }

  ngOnDestroy(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }
  }

  private isLocalHost(): boolean {
    return ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname) || !environment.production;
  }
}
