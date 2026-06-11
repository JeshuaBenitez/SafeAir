import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, interval, map } from 'rxjs';

import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';
import {
  DashboardEnvironmentState,
  DashboardEnvironmentViewModel,
  DashboardRoomOption,
} from '@features/dashboard/domain/models/dashboard-environment-state.model';
import { API_CLIENT } from '@core/config/api-client.token';
import { environment } from '../../../../../environments/environment';

const UPDATE_INTERVAL_MS = 2200;
const HISTORY_LIMIT = 24;

@Injectable({ providedIn: 'root' })
export class DashboardEnvironmentMockService {
  private readonly apiClient = inject(API_CLIENT);
  private readonly roomsSubject = new BehaviorSubject<readonly DashboardRoom[]>([]);
  private readonly selectedRoomIdSubject = new BehaviorSubject<string | null>(null);
  private readonly stateByRoomSubject = new BehaviorSubject<Readonly<Record<string, DashboardEnvironmentState>>>({});
  
  private isPaused = false;

  readonly viewModel$ = combineLatest([
    this.roomsSubject,
    this.selectedRoomIdSubject,
    this.stateByRoomSubject,
  ]).pipe(
    map(([rooms, selectedRoomId, stateByRoom]): DashboardEnvironmentViewModel => {
      const roomOptions = rooms.map((room): DashboardRoomOption => {
        const roomState = stateByRoom[room.id];
        return {
          id: room.id,
          label: room.name,
          statusLabel: room.hasEmulator === false ? 'Sin emulador' : (roomState ? this.getStatusLabel(roomState) : 'Sin datos'),
        };
      });

      const activeRoomId = selectedRoomId && rooms.some((room) => room.id === selectedRoomId) ? selectedRoomId : rooms[0]?.id ?? null;
      const activeRoom = activeRoomId ? rooms.find((room) => room.id === activeRoomId) ?? null : null;

      return {
        rooms: roomOptions,
        selectedRoomId: activeRoomId,
        selectedRoomLabel: activeRoom?.name ?? null,
        selectedRoomHasEmulator: activeRoom?.hasEmulator !== false,
        selectedState: activeRoomId ? stateByRoom[activeRoomId] ?? null : null,
      };
    }),
  );

  constructor() {
    interval(UPDATE_INTERVAL_MS).subscribe(() => {
      this.tick();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.resumeTelemetry();
        }
      });
    }
  }

  pauseTelemetry(): void {
    this.isPaused = true;
  }

  resumeTelemetry(): void {
    this.isPaused = false;
    this.tick();
  }

  resetState(): void {
    this.roomsSubject.next([]);
    this.selectedRoomIdSubject.next(null);
    this.stateByRoomSubject.next({});
  }

  setRooms(rooms: readonly DashboardRoom[]): void {
    this.roomsSubject.next(rooms);

    const previousMap = this.stateByRoomSubject.value;
    const nextMap: Record<string, DashboardEnvironmentState> = {};

    for (const room of rooms) {
      if (environment.DASHBOARD_MODE === 'api') {
        if (room.hasEmulator !== false) {
          const seededState = this.createStateFromLatestMetrics(room, previousMap[room.id]);
          if (seededState) {
            nextMap[room.id] = seededState;
          }
        }
      } else {
        nextMap[room.id] = previousMap[room.id] ?? this.createInitialState(room);
      }
    }

    this.stateByRoomSubject.next(nextMap);

    const selectedRoomId = this.selectedRoomIdSubject.value;
    if (selectedRoomId && rooms.some((room) => room.id === selectedRoomId)) {
      if (environment.DASHBOARD_MODE === 'api') {
        this.tick();
      }
      return;
    }

    this.selectedRoomIdSubject.next(rooms[0]?.id ?? null);
    if (environment.DASHBOARD_MODE === 'api') {
      this.tick();
    }
  }

  selectRoom(roomId: string): void {
    if (!this.roomsSubject.value.some((room) => room.id === roomId)) {
      return;
    }

    this.selectedRoomIdSubject.next(roomId);
  }

  private tick(): void {
    if (this.isPaused) {
      return;
    }

    const rooms = this.roomsSubject.value;
    if (rooms.length === 0) {
      return;
    }

    if (environment.DASHBOARD_MODE === 'api') {
      this.tickApi().catch((error) => {
        console.error('Error en tick de telemetría real:', error);
      });
    } else {
      this.tickMock();
    }
  }

  private async tickApi(): Promise<void> {
    const rooms = this.roomsSubject.value;
    const currentMap = this.stateByRoomSubject.value;
    const nextMap = { ...currentMap };
    let hasChanges = false;

    const promises = rooms.map(async (room) => {
      if (room.hasEmulator === false) {
        if (nextMap[room.id]) {
          delete nextMap[room.id];
          hasChanges = true;
        }
        return;
      }

      try {
        const response = await this.apiClient.get<any>(`/api/v1/rooms/${room.id}/metrics/current`);

        if (!response || !response.data) {
          if (nextMap[room.id]) {
            delete nextMap[room.id];
            hasChanges = true;
          }
          return;
        }

        const metrics = response.data;
        const previousState = currentMap[room.id];

        const temperatureC = metrics.temperature;
        const humidityPct = metrics.humidity;
        const co2Ppm = metrics.co2;
        const pm25UgM3 = metrics.pm25;

        // Mantener historial acumulado para graficos
        const co2History = previousState && Array.isArray(previousState.co2History)
          ? this.pushHistory(previousState.co2History, co2Ppm)
          : Array(10).fill(co2Ppm);

        const pm25History = previousState && Array.isArray(previousState.pm25History)
          ? this.pushHistory(previousState.pm25History, pm25UgM3)
          : Array(10).fill(pm25UgM3);

        nextMap[room.id] = {
          roomId: room.id,
          temperatureC,
          humidityPct,
          co2Ppm,
          pm25UgM3,
          co2History,
          pm25History,
          updatedAt: new Date(metrics.measuredAt).getTime(),
        };
        hasChanges = true;
      } catch (error) {
        if (nextMap[room.id]) {
          delete nextMap[room.id];
          hasChanges = true;
        }
      }
    });

    await Promise.all(promises);

    if (hasChanges) {
      this.stateByRoomSubject.next(nextMap);
    }
  }

  private tickMock(): void {
    const rooms = this.roomsSubject.value;
    const currentMap = this.stateByRoomSubject.value;
    const nextMap: Record<string, DashboardEnvironmentState> = {};

    for (const room of rooms) {
      const currentState = currentMap[room.id] ?? this.createInitialState(room);
      nextMap[room.id] = this.getNextState(room, currentState);
    }

    this.stateByRoomSubject.next(nextMap);
  }

  private createInitialState(room: DashboardRoom): DashboardEnvironmentState {
    const seed = this.getSeed(room.id);

    const temperatureC = this.roundToOneDecimal(this.seedRange(seed, 0, 18, 32));
    const humidityPct = Math.round(this.seedRange(seed, 1, 35, 85));
    const co2Ppm = Math.round(this.seedRange(seed, 2, 350, 780));
    const pm25UgM3 = Math.round(this.seedRange(seed, 3, 8, 36));

    return {
      roomId: room.id,
      temperatureC,
      humidityPct,
      co2Ppm,
      pm25UgM3,
      co2History: this.seedHistory(co2Ppm, seed, 24),
      pm25History: this.seedHistory(pm25UgM3, seed + 7, 24),
      updatedAt: Date.now(),
    };
  }

  private createStateFromLatestMetrics(
    room: DashboardRoom,
    previousState?: DashboardEnvironmentState,
  ): DashboardEnvironmentState | null {
    const metrics = room.latestMetrics;
    if (!metrics) {
      return previousState ?? null;
    }

    const co2History = previousState && Array.isArray(previousState.co2History)
      ? this.pushHistory(previousState.co2History, metrics.co2)
      : Array(10).fill(metrics.co2);

    const pm25History = previousState && Array.isArray(previousState.pm25History)
      ? this.pushHistory(previousState.pm25History, metrics.pm25)
      : Array(10).fill(metrics.pm25);

    return {
      roomId: room.id,
      temperatureC: metrics.temperature,
      humidityPct: metrics.humidity,
      co2Ppm: metrics.co2,
      pm25UgM3: metrics.pm25,
      co2History,
      pm25History,
      updatedAt: metrics.measuredAt ? new Date(metrics.measuredAt).getTime() : Date.now(),
    };
  }

  private getNextState(room: DashboardRoom, current: DashboardEnvironmentState): DashboardEnvironmentState {
    const windowsFactor = Math.min(3, room.windowsCount) * 0.08;
    const actuatorFactor = Math.min(9, this.getActuatorCount(room)) * 0.04;

    const temperatureTarget = 22.8 + (0.9 - actuatorFactor) + this.noise(0.6);
    const humidityTarget = 52 + (3 - room.windowsCount) * 1.1 + this.noise(2.4);
    const co2Target = 520 + (2 - room.windowsCount) * 80 - actuatorFactor * 36 + this.noise(70);
    const pm25Target = 22 + (1.5 - windowsFactor * 8) + this.noise(10);

    const temperatureC = this.roundToOneDecimal(this.smooth(current.temperatureC, temperatureTarget, 0.24, 18, 32));
    const humidityPct = Math.round(this.smooth(current.humidityPct, humidityTarget, 0.2, 35, 85));
    const co2Ppm = Math.round(this.smooth(current.co2Ppm, co2Target, 0.22, 350, 1200));
    const pm25UgM3 = Math.round(this.smooth(current.pm25UgM3, pm25Target, 0.25, 5, 80));

    return {
      roomId: current.roomId,
      temperatureC,
      humidityPct,
      co2Ppm,
      pm25UgM3,
      co2History: this.pushHistory(current.co2History, co2Ppm),
      pm25History: this.pushHistory(current.pm25History, pm25UgM3),
      updatedAt: Date.now(),
    };
  }

  private getStatusLabel(state: DashboardEnvironmentState): string {
    if (state.co2Ppm <= 700 && state.pm25UgM3 <= 20) {
      return 'Optimo';
    }

    if (state.co2Ppm <= 950 && state.pm25UgM3 <= 40) {
      return 'Estable';
    }

    return 'Revisar';
  }

  private getActuatorCount(room: DashboardRoom): number {
    return room.actuators.minisplit.quantity + room.actuators.purifier.quantity + room.actuators.extractor.quantity;
  }

  private smooth(current: number, target: number, factor: number, min: number, max: number): number {
    const next = current + (target - current) * factor;
    return Math.min(max, Math.max(min, next));
  }

  private pushHistory(history: readonly number[], value: number): readonly number[] {
    const next = [...history, value];
    return next.slice(Math.max(0, next.length - HISTORY_LIMIT));
  }

  private seedHistory(baseValue: number, seed: number, points: number): readonly number[] {
    const values: number[] = [];
    for (let index = 0; index < points; index++) {
      const drift = this.seedRange(seed + index * 5, index, -28, 28);
      values.push(Math.max(1, Math.round(baseValue + drift * 0.4)));
    }

    return values;
  }

  private getSeed(value: string): number {
    let hash = 0;
    for (let index = 0; index < value.length; index++) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash);
  }

  private seedRange(seed: number, offset: number, min: number, max: number): number {
    const normalized = ((seed * 9301 + 49297 + offset * 233) % 233280) / 233280;
    return min + normalized * (max - min);
  }

  private noise(amplitude: number): number {
    return (Math.random() * 2 - 1) * amplitude;
  }

  private roundToOneDecimal(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
