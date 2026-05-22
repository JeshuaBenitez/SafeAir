import { AsyncPipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { RoomActuatorCardComponent } from '@features/dashboard/components/room-actuator-card/room-actuator-card.component';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';
import { ActuatorSize } from '@features/dashboard/domain/models/actuator-size.model';
import { ActuatorType } from '@features/dashboard/domain/models/actuator-type.model';
import { CreateRoomDraft } from '@features/dashboard/domain/models/create-room-draft.model';

type AddRoomFormShape = {
  roomName: FormControl<string>;
  areaM2: FormControl<number>;
  windowsCount: FormControl<number>;
  minisplitQty: FormControl<number>;
  purifierQty: FormControl<number>;
  extractorQty: FormControl<number>;
  minisplitSize: FormControl<ActuatorSize>;
  purifierSize: FormControl<ActuatorSize>;
  extractorSize: FormControl<ActuatorSize>;
};

const REQUIRED_ACTUATOR_TYPES: readonly ActuatorType[] = ['minisplit', 'purifier', 'extractor'];

const isValidActuatorQuantityForSave = (quantity: number): boolean =>
  Number.isInteger(quantity) && quantity >= 1 && quantity <= 3;

const requiredActuatorRangeValidator = (control: AbstractControl): ValidationErrors | null => {
  const form = control as FormGroup<AddRoomFormShape>;
  const missingTypes: ActuatorType[] = [];

  for (const type of REQUIRED_ACTUATOR_TYPES) {
    const quantity =
      type === 'minisplit'
        ? form.controls.minisplitQty.value
        : type === 'purifier'
          ? form.controls.purifierQty.value
          : form.controls.extractorQty.value;

    if (!isValidActuatorQuantityForSave(quantity)) {
      missingTypes.push(type);
    }
  }

  return missingTypes.length > 0
    ? { requiredActuatorRange: { types: missingTypes } }
    : null;
};

@Component({
  selector: 'sa-rooms-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    NgIf,
    NgFor,
    ReactiveFormsModule,
    DashboardSidebarComponent,
    DashboardTopbarComponent,
    RoomActuatorCardComponent,
  ],
  templateUrl: './rooms-page.component.html',
  styleUrl: './rooms-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomsPageComponent {
  readonly viewModel$ = this.dashboardFacade.viewModel$;
  readonly maxRoomsPerDashboard = this.dashboardFacade.maxRoomsPerDashboard;

  readonly form = new FormGroup<AddRoomFormShape>(
    {
      roomName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(40)],
      }),

      areaM2: new FormControl(142, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(1), Validators.max(300)],
      }),

      windowsCount: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(12)],
      }),

      /*
        IMPORTANTE:
        Antes estaban en 1, por eso los actuadores aparecían activados al entrar.
        Ahora nacen en 0 para que se vean desactivados.
      */
      minisplitQty: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(3)],
      }),

      purifierQty: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(3)],
      }),

      extractorQty: new FormControl(0, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(3)],
      }),

      minisplitSize: new FormControl<ActuatorSize>('small', {
        nonNullable: true,
        validators: [Validators.required],
      }),

      purifierSize: new FormControl<ActuatorSize>('small', {
        nonNullable: true,
        validators: [Validators.required],
      }),

      extractorSize: new FormControl<ActuatorSize>('small', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    {
      validators: [requiredActuatorRangeValidator],
    },
  );

  saveError: string | null = null;
  saveAttempted = false;

  constructor(
    private readonly dashboardFacade: DashboardFacade,
    private readonly router: Router,
  ) {}

  get roomNameControl(): FormControl<string> {
    return this.form.controls.roomName;
  }

  get areaControl(): FormControl<number> {
    return this.form.controls.areaM2;
  }

  get windowsControl(): FormControl<number> {
    return this.form.controls.windowsCount;
  }

  hasRoomCapacity(): boolean {
    return this.dashboardFacade.hasRoomCapacity();
  }

  get missingActuatorTypes(): readonly ActuatorType[] {
    const error = this.form.errors?.['requiredActuatorRange'] as
      | { readonly types?: readonly ActuatorType[] }
      | undefined;

    return Array.isArray(error?.types) ? error.types : [];
  }

  shouldShowActuatorError(type: ActuatorType): boolean {
    return this.shouldShowValidationFeedback() && this.missingActuatorTypes.includes(type);
  }

  setActuatorQuantity(type: 'minisplit' | 'purifier' | 'extractor', quantity: number): void {
    this.saveError = null;

    const safeQuantity = Math.min(3, Math.max(0, Number(quantity) || 0));

    if (type === 'minisplit') {
      this.form.controls.minisplitQty.setValue(safeQuantity);
      return;
    }

    if (type === 'purifier') {
      this.form.controls.purifierQty.setValue(safeQuantity);
      return;
    }

    this.form.controls.extractorQty.setValue(safeQuantity);
  }

  setActuatorSize(type: 'minisplit' | 'purifier' | 'extractor', size: ActuatorSize): void {
    this.saveError = null;

    if (type === 'minisplit') {
      this.form.controls.minisplitSize.setValue(size);
      return;
    }

    if (type === 'purifier') {
      this.form.controls.purifierSize.setValue(size);
      return;
    }

    this.form.controls.extractorSize.setValue(size);
  }

  onAreaSliderChange(rawValue: string): void {
    const value = Number(rawValue);
    this.areaControl.setValue(Number.isFinite(value) ? value : 1);
  }

  incrementWindows(delta: number): void {
    const nextValue = this.windowsControl.value + delta;
    const clamped = Math.min(12, Math.max(0, nextValue));

    this.windowsControl.setValue(clamped);
  }

  onSaveRoom(): void {
    this.saveAttempted = true;
    this.saveError = null;

    if (!this.hasRoomCapacity()) {
      this.saveError = 'Ya alcanzaste el máximo de 3 habitaciones.';
      return;
    }

    if (this.form.invalid) {
      if (this.missingActuatorTypes.length > 0) {
        this.saveError = 'Cada actuador debe estar entre 1 y 3 para guardar la habitación.';
      }

      this.form.markAllAsTouched();
      return;
    }

    const draft = this.toCreateRoomDraft();
    const result = this.dashboardFacade.addRoom(draft);

    if (!result.ok) {
      if (result.reason === 'max-rooms-reached') {
        this.saveError = 'No fue posible guardar: máximo de 3 habitaciones por dashboard.';
      } else if (result.reason === 'invalid-actuator-range') {
        this.saveError = 'No fue posible guardar: cada actuador debe tener entre 1 y 3 unidades.';
      } else {
        this.saveError = 'No fue posible guardar: valida los datos de la habitación.';
      }

      return;
    }

    void this.router.navigateByUrl('/dashboard');
  }

  actuatorLabel(type: ActuatorType): string {
    if (type === 'minisplit') return 'MiniSplit';
    if (type === 'purifier') return 'Purifier';
    return 'Extractor';
  }

  private shouldShowValidationFeedback(): boolean {
    return this.saveAttempted || this.form.touched;
  }

  private toCreateRoomDraft(): CreateRoomDraft {
    return {
      name: this.roomNameControl.value,
      areaM2: this.areaControl.value,
      windowsCount: this.windowsControl.value,
      actuatorQuantities: {
        minisplit: this.form.controls.minisplitQty.value,
        purifier: this.form.controls.purifierQty.value,
        extractor: this.form.controls.extractorQty.value,
      },
      actuatorSizes: {
        minisplit: this.form.controls.minisplitSize.value,
        purifier: this.form.controls.purifierSize.value,
        extractor: this.form.controls.extractorSize.value,
      },
    };
  }
}