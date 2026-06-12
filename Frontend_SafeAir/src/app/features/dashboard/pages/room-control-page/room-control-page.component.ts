import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardEnvironmentMockService } from '@features/dashboard/application/services/dashboard-environment-mock.service';
import { DashboardEnvironmentState } from '@features/dashboard/domain/models/dashboard-environment-state.model';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';
import { DashboardUser } from '@features/dashboard/domain/models/dashboard-user.model';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';
import { API_CLIENT } from '@core/config/api-client.token';

type ActuatorKey = 'minisplit' | 'purifier' | 'extractor';

interface VisualActuator {
  key: ActuatorKey;
  label: string;
  quantity: number;
  iconOn: string;
  iconOff: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface UnitControlState {
  on: boolean;
  value: number;
}

interface EnvironmentMetricCard {
  title: string;
  value: string;
  status: string;
  icon: string;
}

interface ActuatorSnapshot {
  deviceIndex: number;
  isOn: boolean | null;
  targetTemperature: number | null;
}

interface ActuatorStateResponse {
  actuators?: Partial<Record<ActuatorKey, ActuatorSnapshot[]>>;
}

@Component({
  selector: 'app-room-control-page',
  standalone: true,
  imports: [CommonModule, DashboardSidebarComponent, DashboardTopbarComponent],
  templateUrl: './room-control-page.component.html',
  styleUrl: './room-control-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomControlPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly facade = inject(DashboardFacade);
  private readonly environmentMockState = inject(DashboardEnvironmentMockService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiClient = inject(API_CLIENT);

  user: DashboardUser = {
    displayName: 'Admin',
    statusLabel: 'CONECTADO',
  };

  locationLabel = 'Rooms > Master Suite Emulator';
  room: DashboardRoom | null = null;
  selectedEnvironmentState: DashboardEnvironmentState | null = null;

  availableActuators: VisualActuator[] = [];
  selectedActuatorKey: ActuatorKey | null = null;

  private readonly unitStates: Record<string, UnitControlState> = {};
  private activeRoomId: string | null = null;
  private readonly pendingUnitKeys = new Set<string>();
  private readonly pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  ngOnInit(): void {
    const handleVisibilityChange = (): void => {
      if (document.hidden) return;
      this.environmentMockState.resumeTelemetry();
      this.refreshActuatorState();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    this.destroyRef.onDestroy(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      for (const timer of this.pendingTimers.values()) {
        clearTimeout(timer);
      }
      this.pendingTimers.clear();
      this.pendingUnitKeys.clear();
    });

    combineLatest([this.facade.viewModel$, this.route.paramMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([vm, params]) => {
        this.user = vm.user;
        this.locationLabel = vm.locationLabel;

        const roomId = params.get('id');
        this.room = vm.rooms.find((item) => item.id === roomId) ?? null;

        this.environmentMockState.setRooms(vm.rooms);

        if (this.activeRoomId !== this.room?.id) {
          this.clearUnitStates();
          this.clearPendingCommands();
          this.selectedEnvironmentState = null;
          this.selectedActuatorKey = null;
          this.activeRoomId = this.room?.id ?? null;
        }

        if (this.room) {
          this.environmentMockState.selectRoom(this.room.id);
        }

        this.availableActuators = this.room && this.hasAssignedEmulator
          ? this.buildAvailableActuators(this.room)
          : [];

        this.ensureSelectedActuator();
        this.ensureUnitStates();
        this.refreshActuatorState();

        this.cdr.markForCheck();
      });

    this.environmentMockState.viewModel$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((environmentVm) => {
        this.selectedEnvironmentState = environmentVm.selectedState;
        this.cdr.markForCheck();
      });

    interval(2200)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshActuatorState();
      });
  }

  get environmentMetrics(): EnvironmentMetricCard[] {
    const state = this.selectedEnvironmentState;
    const missingStatus = this.hasAssignedEmulator ? 'Sin métricas disponibles' : 'Sin emulador asignado';

    return [
      {
        title: 'TEMPERATURA',
        value: state ? `${this.formatOneDecimal(state.temperatureC)}°C` : '--°C',
        status: state ? this.getTemperatureStatus(state.temperatureC) : missingStatus,
        icon: 'assets/icons/temperatura.png',
      },
      {
        title: 'HUMEDAD',
        value: state ? `${Math.round(state.humidityPct)}%` : '--%',
        status: state ? this.getHumidityStatus(state.humidityPct) : missingStatus,
        icon: 'assets/icons/humedad.png',
      },
      {
        title: 'CO2',
        value: state ? `${Math.round(state.co2Ppm)} ppm` : '-- ppm',
        status: state ? this.getCo2Status(state.co2Ppm) : missingStatus,
        icon: 'assets/icons/actuador.png',
      },
      {
        title: 'PM2.5',
        value: state ? `${Math.round(state.pm25UgM3)} μg/m³` : '-- μg/m³',
        status: state ? this.getPm25Status(state.pm25UgM3) : missingStatus,
        icon: 'assets/icons/pm.png',
      },
    ];
  }

  get hasAssignedEmulator(): boolean {
    return this.room?.hasEmulator !== false;
  }

  get selectedActuator(): VisualActuator | null {
    if (!this.selectedActuatorKey) return null;
    return this.availableActuators.find((item) => item.key === this.selectedActuatorKey) ?? null;
  }

  get selectedUnits(): number[] {
    if (!this.selectedActuatorKey) return [];
    const quantity = this.getActuatorQuantity(this.selectedActuatorKey);
    return Array.from({ length: quantity }, (_, index) => index + 1);
  }

  get simpleUnitPlaceholders(): number[] {
    const missingSlots = Math.max(0, 3 - this.selectedUnits.length);
    return Array.from({ length: missingSlots }, (_, index) => index + 1);
  }

  get roomImage(): string {
    return this.room?.controlImageSrc || 'assets/images/3d.png';
  }

  selectActuator(key: ActuatorKey): void {
    if (!this.hasAssignedEmulator) return;
    this.selectedActuatorKey = key;
  }

  isSelectedActuator(key: ActuatorKey): boolean {
    return this.selectedActuatorKey === key;
  }

  getBadgeIcon(actuator: VisualActuator): string {
    return this.isSelectedActuator(actuator.key) ? actuator.iconOn : actuator.iconOff;
  }

  getPanelTitle(): string {
    switch (this.selectedActuatorKey) {
      case 'minisplit':
        return 'Sistema Minisplit';
      case 'purifier':
        return 'Purificador de Aire';
      case 'extractor':
        return 'Extractor de Aire';
      default:
        return 'Control de Actuadores';
    }
  }

  getPanelIcon(): string {
    switch (this.selectedActuatorKey) {
      case 'minisplit':
        return 'assets/icons/copoon.png';
      case 'purifier':
        return 'assets/icons/purifion.png';
      case 'extractor':
        return 'assets/icons/aireon.png';
      default:
        return 'assets/icons/actuador.png';
    }
  }

  getActuatorSize(type: ActuatorKey): 'small' | 'medium' | 'large' {
    if (!this.room) return 'small';

    switch (type) {
      case 'minisplit':
        return this.room.actuators.minisplit.size;
      case 'purifier':
        return this.room.actuators.purifier.size;
      case 'extractor':
        return this.room.actuators.extractor.size;
    }
  }

  getActuatorQuantity(type: ActuatorKey): number {
    if (!this.room) return 0;

    switch (type) {
      case 'minisplit':
        return Number(this.room.actuators.minisplit.quantity ?? 0);
      case 'purifier':
        return Number(this.room.actuators.purifier.quantity ?? 0);
      case 'extractor':
        return Number(this.room.actuators.extractor.quantity ?? 0);
    }
  }

  sizeLabel(value: 'small' | 'medium' | 'large'): string {
    switch (value) {
      case 'small':
        return 'Tamaño: Small';
      case 'medium':
        return 'Tamaño: Medium';
      case 'large':
        return 'Tamaño: Large';
    }
  }

  unitTitle(index: number): string {
    switch (this.selectedActuatorKey) {
      case 'minisplit':
        return `Minisplit Unidad ${index}`;
      case 'purifier':
        return `Purificador Unidad ${index}`;
      case 'extractor':
        return `Extractor Unidad ${index}`;
      default:
        return `Unidad ${index}`;
    }
  }

  isUnitOn(index: number): boolean {
    if (!this.selectedActuatorKey) return false;
    return this.getUnitState(this.selectedActuatorKey, index).on;
  }

  isUnitPending(index: number): boolean {
    if (!this.selectedActuatorKey) return false;
    return this.pendingUnitKeys.has(this.buildUnitKey(this.selectedActuatorKey, index));
  }

  hasPendingCommands(): boolean {
    return this.pendingUnitKeys.size > 0;
  }

  async toggleUnit(index: number): Promise<void> {
    if (!this.selectedActuatorKey || !this.hasAssignedEmulator) return;

    const key = this.buildUnitKey(this.selectedActuatorKey, index);
    if (this.pendingUnitKeys.has(key)) return;

    const current = this.unitStates[key] ?? { on: false, value: 24 };
    const nextOn = !current.on;

    await this.sendActuatorCommand(this.selectedActuatorKey, index, nextOn ? 'turn_on' : 'turn_off', nextOn);
  }

  getUnitValue(index: number): number {
    if (!this.selectedActuatorKey) return 24;
    return this.getUnitState(this.selectedActuatorKey, index).value;
  }

  setUnitValue(index: number, event: Event): void {
    if (!this.selectedActuatorKey || !this.hasAssignedEmulator) return;

    if (this.pendingUnitKeys.has(this.buildUnitKey(this.selectedActuatorKey, index))) {
      return;
    }

    const target = event.target as HTMLInputElement;
    const key = this.buildUnitKey(this.selectedActuatorKey, index);
    const current = this.unitStates[key] ?? { on: false, value: 24 };

    this.unitStates[key] = {
      ...current,
      value: Number(target.value),
    };
    this.cdr.markForCheck();
  }

  async commitUnitTemperature(index: number): Promise<void> {
    if (this.selectedActuatorKey !== 'minisplit' || !this.hasAssignedEmulator) return;

    if (this.pendingUnitKeys.has(this.buildUnitKey('minisplit', index))) return;

    const value = this.getUnitValue(index);
    await this.sendActuatorCommand('minisplit', index, 'set_temperature', value);
  }
getTemperaturePercent(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }

  const percent = ((value - min) / (max - min)) * 100;

  return Math.max(0, Math.min(100, percent));
}
  areAllSelectedUnitsOn(): boolean {
    const units = this.getAllConfiguredUnits();
    if (units.length === 0) {
      return false;
    }

    return units.every(({ type, index }) => this.getUnitState(type, index).on);
  }

  async toggleAllSelected(): Promise<void> {
    if (!this.hasAssignedEmulator || this.hasPendingCommands()) return;

    const shouldTurnOff = this.areAllSelectedUnitsOn();
    const nextOn = !shouldTurnOff;
    const units = this.getAllConfiguredUnits();

    await Promise.all(
      units.map(({ type, index }) =>
        this.sendActuatorCommand(type, index, nextOn ? 'turn_on' : 'turn_off', nextOn),
      ),
    );
  }

  activateAllSelected(): void {
    this.toggleAllSelected();
  }

  private getTemperatureStatus(value: number): string {
    if (value < 20) {
      return '↘ Frío';
    }

    if (value <= 26) {
      return '↗ Optimal Range';
    }

    if (value <= 29) {
      return '≈ Cálido';
    }

    return '⚠ Alta';
  }

  private getHumidityStatus(value: number): string {
    if (value < 40) {
      return '↘ Baja';
    }

    if (value <= 60) {
      return '≈ Stable';
    }

    if (value <= 75) {
      return '↗ Alta';
    }

    return '⚠ Muy alta';
  }

  private getCo2Status(value: number): string {
    if (value <= 700) {
      return '◎ Excellent';
    }

    if (value <= 950) {
      return '≈ Stable';
    }

    if (value <= 1200) {
      return '↗ Alto';
    }

    return '⚠ Crítico';
  }

  private getPm25Status(value: number): string {
    if (value <= 20) {
      return '◎ Excellent';
    }

    if (value <= 40) {
      return '≈ Stable';
    }

    if (value <= 60) {
      return '↗ Alto';
    }

    return '⚠ Crítico';
  }

  private formatOneDecimal(value: number): string {
    return value.toFixed(1);
  }

  private ensureSelectedActuator(): void {
    if (!this.hasAssignedEmulator) {
      this.selectedActuatorKey = null;
      return;
    }

    const selectedStillExists = this.availableActuators.some(
      (item) => item.key === this.selectedActuatorKey,
    );

    if (!selectedStillExists) {
      this.selectedActuatorKey = this.availableActuators[0]?.key ?? null;
    }
  }

  private ensureUnitStates(): void {
    if (!this.room || !this.hasAssignedEmulator) return;

    const keys: ActuatorKey[] = ['minisplit', 'purifier', 'extractor'];

    for (const key of keys) {
      const quantity = this.getActuatorQuantity(key);

      for (let index = 1; index <= quantity; index++) {
        const stateKey = this.buildUnitKey(key, index);

        if (!this.unitStates[stateKey]) {
          this.unitStates[stateKey] = {
            on: false,
            value: 24,
          };
        }
      }
    }
  }

  private getUnitState(type: ActuatorKey, index: number): UnitControlState {
    const key = this.buildUnitKey(type, index);
    return this.unitStates[key] ?? { on: false, value: 24 };
  }

  private buildUnitKey(type: ActuatorKey, index: number): string {
    return `${type}-${index}`;
  }

  private getAllConfiguredUnits(): Array<{ type: ActuatorKey; index: number }> {
    const result: Array<{ type: ActuatorKey; index: number }> = [];
    const types: ActuatorKey[] = ['minisplit', 'purifier', 'extractor'];

    for (const type of types) {
      const quantity = this.getActuatorQuantity(type);
      for (let index = 1; index <= quantity; index++) {
        result.push({ type, index });
      }
    }

    return result;
  }

  private async sendActuatorCommand(
    deviceType: ActuatorKey,
    deviceIndex: number,
    action: 'turn_on' | 'turn_off' | 'set_temperature',
    value: boolean | number,
  ): Promise<void> {
    if (!this.room || !this.hasAssignedEmulator) return;

    const unitKey = this.buildUnitKey(deviceType, deviceIndex);
    if (this.pendingUnitKeys.has(unitKey)) return;

    const current = this.unitStates[unitKey] ?? { on: false, value: 24 };
    this.pendingUnitKeys.add(unitKey);
    this.unitStates[unitKey] = {
      ...current,
      on: action === 'set_temperature' ? current.on : Boolean(value),
      value: action === 'set_temperature' ? Number(value) : current.value,
    };
    this.cdr.markForCheck();

    try {
      await this.apiClient.post(`/api/v1/rooms/${this.room.id}/actuators/${deviceType}/command`, {
        action,
        deviceIndex,
        value,
        source: 'frontend',
      });
    } catch (error) {
      console.error('Error enviando comando de actuador:', error);
    } finally {
      this.schedulePendingRecovery(unitKey);
    }
  }

  private schedulePendingRecovery(unitKey: string): void {
    const existingTimer = this.pendingTimers.get(unitKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.pendingTimers.delete(unitKey);
      this.pendingUnitKeys.delete(unitKey);
      this.refreshActuatorState();
      this.cdr.markForCheck();
    }, 1800);

    this.pendingTimers.set(unitKey, timer);
  }

  private async refreshActuatorState(): Promise<void> {
    if (!this.room || !this.hasAssignedEmulator) return;

    try {
      const response = await this.apiClient.get<ActuatorStateResponse>(`/api/v1/rooms/${this.room.id}/actuators/state`);
      const actuators = response.data?.actuators;
      if (!actuators) {
        return;
      }

      this.applyReportedState('minisplit', actuators.minisplit);
      this.applyReportedState('purifier', actuators.purifier);
      this.applyReportedState('extractor', actuators.extractor);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error consultando estado de actuadores:', error);
    }
  }

  private applyReportedState(type: ActuatorKey, reportedUnits: ActuatorSnapshot[] | undefined): void {
    if (!reportedUnits) {
      return;
    }

    for (const reported of reportedUnits) {
      if (reported.isOn === null) {
        continue;
      }

      const key = this.buildUnitKey(type, reported.deviceIndex);
      const current = this.unitStates[key] ?? { on: false, value: 24 };

      this.unitStates[key] = {
        ...current,
        on: Boolean(reported.isOn),
        value: type === 'minisplit'
          ? Number(reported.targetTemperature ?? current.value ?? 24)
          : current.value,
      };
    }
  }

  private clearUnitStates(): void {
    for (const key of Object.keys(this.unitStates)) {
      delete this.unitStates[key];
    }
  }

  private clearPendingCommands(): void {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.pendingUnitKeys.clear();
  }

  private buildAvailableActuators(room: DashboardRoom): VisualActuator[] {
    const items: VisualActuator[] = [];

    if ((room.actuators.minisplit.quantity ?? 0) > 0) {
      items.push({
        key: 'minisplit',
        label: 'Sistema Minisplit',
        quantity: room.actuators.minisplit.quantity,
        iconOn: 'assets/icons/copoon.png',
        iconOff: 'assets/icons/copooff.png',
        top: '14px',
        right: '18px',
      });
    }

    if ((room.actuators.purifier.quantity ?? 0) > 0) {
      items.push({
        key: 'purifier',
        label: 'Purificador de Aire',
        quantity: room.actuators.purifier.quantity,
        iconOn: 'assets/icons/purifion.png',
        iconOff: 'assets/icons/purifioff.png',
        bottom: '18px',
        left: '18px',
      });
    }

    if ((room.actuators.extractor.quantity ?? 0) > 0) {
      items.push({
        key: 'extractor',
        label: 'Extractor de Aire',
        quantity: room.actuators.extractor.quantity,
        iconOn: 'assets/icons/aireon.png',
        iconOff: 'assets/icons/aireoff.png',
        bottom: '18px',
        right: '18px',
      });
    }

    return items;
  }
}
