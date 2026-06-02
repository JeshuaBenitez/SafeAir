import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf, NgFor } from '@angular/common';
import { AuthError } from '@features/auth/domain/models/auth-error.model';

/** Tiempo de vida del OTP en segundos (5 minutos) */
const OTP_EXPIRY_SECONDS = 300;
/** Cooldown antes de permitir reenviar el código (60 segundos) */
const RESEND_COOLDOWN_SECONDS = 60;

@Component({
  selector: 'sa-otp-form',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule],
  templateUrl: './otp-form.component.html',
  styleUrl: './otp-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpFormComponent implements OnInit, OnDestroy, OnChanges {
  @Input() email: string | null | undefined = '';
  @Input() loading = false;
  @Input() error: AuthError | null = null;

  @Output() readonly verifyOtp = new EventEmitter<string>();
  @Output() readonly resendOtp = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  otpForm = new FormGroup({
    digits: new FormArray([
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
      new FormControl('', [Validators.required, Validators.pattern('[0-9]')]),
    ])
  });

  /** Countdown de expiración del OTP (5 minutos) */
  countdown = OTP_EXPIRY_SECONDS;
  /** Cooldown para reenviar código (60 segundos) */
  resendCooldown = RESEND_COOLDOWN_SECONDS;
  resent = false;

  private expiryTimer: ReturnType<typeof setInterval> | null = null;
  private resendTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  get digitsFormArray(): FormArray {
    return this.otpForm.get('digits') as FormArray;
  }

  ngOnInit(): void {
    this.startExpiryTimer();
    this.startResendCooldown();
    // Auto-enfocar el primer input después de renderizar
    setTimeout(() => {
      const firstInput = document.getElementById('otp-digit-0') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ('loading' in changes) {
      if (this.loading) {
        this.digitsFormArray.controls.forEach(c => c.disable({ emitEvent: false }));
      } else {
        this.digitsFormArray.controls.forEach(c => c.enable({ emitEvent: false }));
      }
    }
  }

  ngOnDestroy(): void {
    this.stopExpiryTimer();
    this.stopResendTimer();
  }

  // ── Expiry Timer (5 min) ──────────────────────────────────────────

  private startExpiryTimer(): void {
    this.stopExpiryTimer();
    this.countdown = OTP_EXPIRY_SECONDS;
    this.expiryTimer = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        this.stopExpiryTimer();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopExpiryTimer(): void {
    if (this.expiryTimer) {
      clearInterval(this.expiryTimer);
      this.expiryTimer = null;
    }
  }

  // ── Resend Cooldown Timer (60 s) ──────────────────────────────────

  private startResendCooldown(): void {
    this.stopResendTimer();
    this.resendCooldown = RESEND_COOLDOWN_SECONDS;
    this.resendTimer = setInterval(() => {
      if (this.resendCooldown > 0) {
        this.resendCooldown--;
      } else {
        this.stopResendTimer();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  private stopResendTimer(): void {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
      this.resendTimer = null;
    }
  }

  // ── Computed ───────────────────────────────────────────────────────

  get formattedTime(): string {
    const minutes = Math.floor(this.countdown / 60);
    const seconds = this.countdown % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  get isExpired(): boolean {
    return this.countdown <= 0;
  }

  get canResend(): boolean {
    return this.resendCooldown <= 0;
  }

  get resendCooldownFormatted(): string {
    return `${this.resendCooldown}s`;
  }

  // ── Input Handlers ────────────────────────────────────────────────

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Solo permitir números
    if (value && !/[0-9]/.test(value)) {
      input.value = '';
      this.digitsFormArray.at(index).setValue('');
      return;
    }

    if (value.length > 0) {
      // Tomar solo el último carácter en caso de copiado/pegado
      const char = value.substring(value.length - 1);
      input.value = char;
      this.digitsFormArray.at(index).setValue(char);

      // Auto-enfocar el siguiente campo
      if (index < 5) {
        const nextInput = document.getElementById(`otp-digit-${index + 1}`) as HTMLInputElement;
        if (nextInput) {
          nextInput.focus();
        }
      }
    }

    // Si los 6 dígitos están completos, enviar automáticamente
    if (this.otpForm.valid) {
      this.onSubmit();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value) {
      // Retroceder y enfocar el campo anterior al borrar
      if (index > 0) {
        const prevInput = document.getElementById(`otp-digit-${index - 1}`) as HTMLInputElement;
        if (prevInput) {
          prevInput.focus();
          prevInput.value = '';
          this.digitsFormArray.at(index - 1).setValue('');
        }
      }
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    
    // Validar si contiene exactamente 6 números
    if (/^\d{6}$/.test(pasteData)) {
      for (let i = 0; i < 6; i++) {
        this.digitsFormArray.at(i).setValue(pasteData[i]);
        const input = document.getElementById(`otp-digit-${i}`) as HTMLInputElement;
        if (input) {
          input.value = pasteData[i];
        }
      }
      this.onSubmit();
    }
  }

  onSubmit(): void {
    if (this.otpForm.invalid || this.loading || this.isExpired) {
      return;
    }

    const code = this.digitsFormArray.controls
      .map(control => control.value)
      .join('');

    this.verifyOtp.emit(code);
  }

  onResendClick(): void {
    if (!this.canResend || this.loading) {
      return;
    }
    this.resendOtp.emit();
    this.resent = true;

    // Reiniciar ambos timers
    this.startExpiryTimer();
    this.startResendCooldown();

    // Limpiar campos de OTP
    this.digitsFormArray.controls.forEach(c => c.setValue(''));
    const firstInput = document.getElementById('otp-digit-0') as HTMLInputElement;
    if (firstInput) {
      firstInput.focus();
    }

    setTimeout(() => {
      this.resent = false;
      this.cdr.markForCheck();
    }, 4000);
  }

  onCancelClick(): void {
    this.cancel.emit();
  }
}
