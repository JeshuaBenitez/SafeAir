import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { DASHBOARD_INITIAL_ROOMS } from '@features/dashboard/data/mock/dashboard-mock-state';
import { CreateRoomDraft } from '@features/dashboard/domain/models/create-room-draft.model';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';
import { RoomActuatorsMap } from '@features/dashboard/domain/models/room-actuator-config.model';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';
import { API_CLIENT } from '@core/config/api-client.token';
import { environment } from '../../../../../environments/environment';

const STORAGE_KEY_PREFIX = 'safeair.dashboard.rooms.mock';
export const MAX_ROOMS_PER_DASHBOARD = 3;

export type AddRoomResult =
  | {
      readonly ok: true;
      readonly room: DashboardRoom;
    }
  | {
      readonly ok: false;
      readonly reason: 'max-rooms-reached' | 'invalid-room-data' | 'invalid-actuator-range';
    };

export type RemoveRoomResult =
  | {
      readonly ok: true;
      readonly roomId: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'room-not-found';
    };

@Injectable({ providedIn: 'root' })
export class DashboardMockStateService {
  private readonly apiClient = inject(API_CLIENT);
  private readonly roomsSubject = new BehaviorSubject<readonly DashboardRoom[]>([]);
  private currentInstanceId: string | null = null;
  private currentInstanceUserId: string | null = null;

  readonly rooms$ = this.roomsSubject.asObservable();

  constructor(private readonly authSessionStorage: AuthSessionStorageService) {}

  getRoomCount(): number {
    return this.roomsSubject.value.length;
  }

  resetState(): void {
    this.currentInstanceId = null;
    this.currentInstanceUserId = this.getCurrentUserId();
    this.roomsSubject.next([]);
  }

  hasRoomCapacity(): boolean {
    return this.getRoomCount() < MAX_ROOMS_PER_DASHBOARD;
  }

  async addRoom(draft: CreateRoomDraft): Promise<AddRoomResult> {
    if (environment.DASHBOARD_MODE !== 'api') {
      return this.addRoomMock(draft);
    }

    try {
      const currentRooms = this.roomsSubject.value;
      if (currentRooms.length >= MAX_ROOMS_PER_DASHBOARD) {
        return {
          ok: false,
          reason: 'max-rooms-reached',
        };
      }

      const validationError = this.validateDraft(draft);
      if (validationError) {
        return {
          ok: false,
          reason: validationError,
        };
      }

      const instanceId = await this.getOrCreateInstanceId(true);
      if (!instanceId) {
        return {
          ok: false,
          reason: 'invalid-room-data',
        };
      }

      const normalizedName = draft.name.trim();

      // 1. Crear cuarto en API
      const roomResponse = await this.apiClient.post<unknown, {
        id: string;
        emulatorAssigned?: boolean;
        emulatorExternalId?: string | null;
      }>('/api/v1/rooms', {
        instanceId,
        name: normalizedName,
      } as any);
      const roomId = roomResponse.data.id;

      // 2. Configurar dimensiones físicas (el backend requiere ancho, largo, alto, etc.)
      const side = Math.sqrt(draft.areaM2);
      const roomWidth = Number(side.toFixed(2));
      const roomLength = Number(side.toFixed(2));
      const roomHeight = 2.7;
      const windowCount = Math.min(6, draft.windowsCount); // Maximo 6 soportado por Zod schema del backend
      const windowAreaTotal = Number((windowCount * 1.5).toFixed(2));

      await this.apiClient.put(`/api/v1/rooms/${roomId}/setup`, {
        roomWidth,
        roomLength,
        roomHeight,
        windowCount,
        windowAreaTotal,
        minisplitCount: draft.actuatorQuantities.minisplit,
        purifierCount: draft.actuatorQuantities.purifier,
        extractorCount: draft.actuatorQuantities.extractor,
      });

      // 3. Registrar dispositivos individuales en el backend
      const devicePromises: Promise<unknown>[] = [];

      for (let index = 1; index <= draft.actuatorQuantities.minisplit; index++) {
        devicePromises.push(
          this.apiClient.post(`/api/v1/rooms/${roomId}/devices`, {
            type: 'minisplit',
            label: `MiniSplit ${index}`,
          })
        );
      }

      for (let index = 1; index <= draft.actuatorQuantities.purifier; index++) {
        devicePromises.push(
          this.apiClient.post(`/api/v1/rooms/${roomId}/devices`, {
            type: 'purifier',
            label: `Purifier ${index}`,
          })
        );
      }

      for (let index = 1; index <= draft.actuatorQuantities.extractor; index++) {
        devicePromises.push(
          this.apiClient.post(`/api/v1/rooms/${roomId}/devices`, {
            type: 'extractor',
            label: `Extractor ${index}`,
          })
        );
      }

      await Promise.all(devicePromises);

      // Recargar cuartos reales
      this.refreshRooms();

      const actuators: RoomActuatorsMap = {
        minisplit: {
          type: 'minisplit',
          quantity: draft.actuatorQuantities.minisplit,
          size: draft.actuatorSizes.minisplit,
        },
        purifier: {
          type: 'purifier',
          quantity: draft.actuatorQuantities.purifier,
          size: draft.actuatorSizes.purifier,
        },
        extractor: {
          type: 'extractor',
          quantity: draft.actuatorQuantities.extractor,
          size: draft.actuatorSizes.extractor,
        },
      };

      const room: DashboardRoom = {
        id: roomId,
        name: normalizedName,
        designation: normalizedName,
        hasEmulator: roomResponse.data.emulatorAssigned !== false,
        areaM2: draft.areaM2,
        windowsCount: draft.windowsCount,
        imageSrc: this.resolveDashboardImage(normalizedName),
        controlImageSrc: 'assets/images/3d.png',
        actuators,
      };

      return {
        ok: true,
        room,
      };
    } catch (error) {
      console.error('Error al agregar habitacion en la API:', error);
      return {
        ok: false,
        reason: 'invalid-room-data',
      };
    }
  }

  async removeRoom(roomId: string): Promise<RemoveRoomResult> {
    if (environment.DASHBOARD_MODE !== 'api') {
      return this.removeRoomMock(roomId);
    }

    try {
      await this.apiClient.delete(`/api/v1/rooms/${roomId}`);
      this.refreshRooms();
      return {
        ok: true,
        roomId,
      };
    } catch (error) {
      console.error('Error al eliminar la habitacion de la API:', error);
      return {
        ok: false,
        reason: 'room-not-found',
      };
    }
  }

  refreshRooms(): void {
    this.resetCachedInstanceIfUserChanged();

    if (environment.DASHBOARD_MODE === 'api') {
      this.roomsSubject.next([]);
      if (!this.authSessionStorage.getSession()) {
        this.currentInstanceId = null;
        return;
      }

      this.loadRoomsFromApi()
        .then((rooms) => {
          this.roomsSubject.next(rooms);
        })
        .catch((error) => {
          console.error('Error cargando habitaciones desde API:', error);
        });
    } else {
      this.roomsSubject.next(this.loadRoomsMock());
    }
  }

  private async getOrCreateInstanceId(createIfMissing = true): Promise<string | null> {
    this.resetCachedInstanceIfUserChanged();

    if (!this.authSessionStorage.getSession()) {
      this.currentInstanceId = null;
      return null;
    }

    if (this.currentInstanceId) {
      return this.currentInstanceId;
    }

    const instancesResponse = await this.apiClient.get<any[]>('/api/v1/instances');
    const instances = instancesResponse.data || [];
    let activeInstance = instances.find((instance: any) => instance.isActive);

    if (!activeInstance && instances.length > 0) {
      activeInstance = instances[0];
    }

    if (!activeInstance && createIfMissing) {
      const createdResponse = await this.apiClient.post<{ id: string }>('/api/v1/instances', {
        name: 'Mi instancia SafeAir',
        description: 'Instancia principal de SafeAir',
      } as any);
      this.currentInstanceId = createdResponse.data.id;
      this.currentInstanceUserId = this.getCurrentUserId();
      return createdResponse.data.id;
    }

    if (!activeInstance) {
      return null;
    }

    this.currentInstanceId = activeInstance.id;
    this.currentInstanceUserId = this.getCurrentUserId();
    return activeInstance.id;
  }

  private async loadRoomsFromApi(): Promise<readonly DashboardRoom[]> {
    try {
      const instanceId = await this.getOrCreateInstanceId(false);
      if (!instanceId) {
        return [];
      }

      const instanceDetailResponse = await this.apiClient.get<any>(`/api/v1/instances/${instanceId}`);

      if (!instanceDetailResponse?.data || !Array.isArray(instanceDetailResponse.data.rooms)) {
        return [];
      }

      const rooms = await Promise.all(instanceDetailResponse.data.rooms.map(async (room: any): Promise<DashboardRoom> => {
        const setup = room.setup || {
          windowCount: 0,
          minisplitCount: 1,
          purifierCount: 1,
          extractorCount: 1,
          roomWidth: 10,
          roomLength: 10,
        };

        const areaM2 = room.derivedSetup?.roomArea || (setup.roomWidth * setup.roomLength) || 100;

        const actuators: RoomActuatorsMap = {
          minisplit: {
            type: 'minisplit',
            quantity: setup.minisplitCount,
            size: 'medium',
          },
          purifier: {
            type: 'purifier',
            quantity: setup.purifierCount,
            size: 'medium',
          },
          extractor: {
            type: 'extractor',
            quantity: setup.extractorCount,
            size: 'medium',
          },
        };

        const latestMetrics = await this.loadLatestMetrics(room.id, Boolean(room.emulator));

        return {
          id: room.id,
          name: room.name,
          designation: room.name,
          hasEmulator: Boolean(room.emulator),
          emulatorExternalId: room.emulator?.emulatorExternalId ?? null,
          latestMetrics,
          areaM2: Math.round(areaM2),
          windowsCount: setup.windowCount,
          imageSrc: this.resolveDashboardImage(room.name),
          controlImageSrc: 'assets/images/3d.png',
          actuators,
        };
      }));

      return rooms;
    } catch (error) {
      console.error('Error al consultar habitaciones de API:', error);
      return [];
    }
  }

  private async loadLatestMetrics(roomId: string, hasEmulator: boolean): Promise<DashboardRoom['latestMetrics']> {
    if (!hasEmulator) {
      return null;
    }

    try {
      const response = await this.apiClient.get<any>(`/api/v1/rooms/${roomId}/metrics/current`);
      const metrics = response.data;

      if (
        !metrics ||
        typeof metrics.temperature !== 'number' ||
        typeof metrics.humidity !== 'number' ||
        typeof metrics.co2 !== 'number' ||
        typeof metrics.pm25 !== 'number'
      ) {
        return null;
      }

      return {
        temperature: metrics.temperature,
        humidity: metrics.humidity,
        co2: metrics.co2,
        pm25: metrics.pm25,
        measuredAt: metrics.measuredAt,
      };
    } catch {
      return null;
    }
  }

  // FALLBACK MOCK LOGIC (preservada por compatibilidad)

  private addRoomMock(draft: CreateRoomDraft): AddRoomResult {
    const currentRooms = this.loadRoomsMock();
    if (currentRooms.length >= MAX_ROOMS_PER_DASHBOARD) {
      return {
        ok: false,
        reason: 'max-rooms-reached',
      };
    }

    const validationError = this.validateDraft(draft);
    if (validationError) {
      return {
        ok: false,
        reason: validationError,
      };
    }

    const normalizedName = draft.name.trim();

    const actuators: RoomActuatorsMap = {
      minisplit: {
        type: 'minisplit',
        quantity: draft.actuatorQuantities.minisplit,
        size: draft.actuatorSizes.minisplit,
      },
      purifier: {
        type: 'purifier',
        quantity: draft.actuatorQuantities.purifier,
        size: draft.actuatorSizes.purifier,
      },
      extractor: {
        type: 'extractor',
        quantity: draft.actuatorQuantities.extractor,
        size: draft.actuatorSizes.extractor,
      },
    };

    const room: DashboardRoom = {
      id: this.createRoomId(),
      name: normalizedName,
      designation: normalizedName,
      areaM2: draft.areaM2,
      windowsCount: draft.windowsCount,
      imageSrc: this.resolveDashboardImage(normalizedName),
      controlImageSrc: 'assets/images/3d.png',
      actuators,
    };

    const nextRooms = [...currentRooms, room];
    this.roomsSubject.next(nextRooms);
    this.persistRooms(nextRooms);

    return {
      ok: true,
      room,
    };
  }

  private removeRoomMock(roomId: string): RemoveRoomResult {
    const currentRooms = this.loadRoomsMock();
    const nextRooms = currentRooms.filter((room) => room.id !== roomId);

    if (nextRooms.length === currentRooms.length) {
      return {
        ok: false,
        reason: 'room-not-found',
      };
    }

    this.roomsSubject.next(nextRooms);
    this.persistRooms(nextRooms);

    return {
      ok: true,
      roomId,
    };
  }

  public loadRoomsMock(): readonly DashboardRoom[] {
    const key = this.getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      return DASHBOARD_INITIAL_ROOMS;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return DASHBOARD_INITIAL_ROOMS;
      }

      return parsed.filter(isDashboardRoom);
    } catch {
      return DASHBOARD_INITIAL_ROOMS;
    }
  }

  private persistRooms(rooms: readonly DashboardRoom[]): void {
    const key = this.getStorageKey();
    localStorage.setItem(key, JSON.stringify(rooms));
  }

  private getCurrentUserId(): string | null {
    try {
      const session = this.authSessionStorage.getSession();
      return session?.userId || null;
    } catch {
      return null;
    }
  }

  private resetCachedInstanceIfUserChanged(): void {
    const userId = this.getCurrentUserId();
    if (this.currentInstanceUserId && this.currentInstanceUserId !== userId) {
      this.currentInstanceId = null;
    }

    this.currentInstanceUserId = userId;
  }

  private getStorageKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `${STORAGE_KEY_PREFIX}.${userId}` : STORAGE_KEY_PREFIX;
  }

  private validateDraft(draft: CreateRoomDraft): 'invalid-room-data' | 'invalid-actuator-range' | null {
    const normalizedName = draft.name.trim();

    if (normalizedName.length < 2 || normalizedName.length > 40) {
      return 'invalid-room-data';
    }

    if (!Number.isFinite(draft.areaM2) || draft.areaM2 < 1 || draft.areaM2 > 300) {
      return 'invalid-room-data';
    }

    if (!Number.isInteger(draft.windowsCount) || draft.windowsCount < 0 || draft.windowsCount > 12) {
      return 'invalid-room-data';
    }

    if (!isValidActuatorQuantityForSave(draft.actuatorQuantities.minisplit)) {
      return 'invalid-actuator-range';
    }

    if (!isValidActuatorQuantityForSave(draft.actuatorQuantities.purifier)) {
      return 'invalid-actuator-range';
    }

    if (!isValidActuatorQuantityForSave(draft.actuatorQuantities.extractor)) {
      return 'invalid-actuator-range';
    }

    if (!isValidActuatorSize(draft.actuatorSizes.minisplit)) {
      return 'invalid-room-data';
    }

    if (!isValidActuatorSize(draft.actuatorSizes.purifier)) {
      return 'invalid-room-data';
    }

    if (!isValidActuatorSize(draft.actuatorSizes.extractor)) {
      return 'invalid-room-data';
    }

    return null;
  }

  private createRoomId(): string {
    if ('randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private resolveDashboardImage(name: string): string {
    const normalized = this.normalizeText(name);

    if (normalized.includes('cocina')) return 'assets/images/cocina.png';
    if (normalized.includes('comedor')) return 'assets/images/comedor.png';
    if (normalized.includes('sala')) return 'assets/images/sala.png';
    if (normalized.includes('habitacion')) return 'assets/images/habitacion.png';
    if (normalized.includes('dormitorio')) return 'assets/images/habitacion.png';
    if (normalized.includes('master')) return 'assets/images/habitacion.png';
    if (normalized.includes('room')) return 'assets/images/habitacion.png';

    return 'assets/images/habitacion.png';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}

const isDashboardRoom = (value: unknown): value is DashboardRoom => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const actuators = candidate['actuators'] as Record<string, unknown> | undefined;

  if (
    typeof candidate['id'] !== 'string' ||
    typeof candidate['name'] !== 'string' ||
    typeof candidate['designation'] !== 'string' ||
    (candidate['hasEmulator'] !== undefined && typeof candidate['hasEmulator'] !== 'boolean') ||
    typeof candidate['areaM2'] !== 'number' ||
    typeof candidate['windowsCount'] !== 'number' ||
    typeof candidate['imageSrc'] !== 'string' ||
    typeof candidate['controlImageSrc'] !== 'string' ||
    !actuators
  ) {
    return false;
  }

  return (
    hasActuatorConfig(actuators['minisplit'], 'minisplit') &&
    hasActuatorConfig(actuators['purifier'], 'purifier') &&
    hasActuatorConfig(actuators['extractor'], 'extractor')
  );
};

const hasActuatorConfig = (
  value: unknown,
  expectedType: 'minisplit' | 'purifier' | 'extractor',
): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const config = value as Record<string, unknown>;
  const size = config['size'];

  return (
    config['type'] === expectedType &&
    typeof config['quantity'] === 'number' &&
    isValidActuatorQuantityForSave(config['quantity']) &&
    (size === 'small' || size === 'medium' || size === 'large')
  );
};

const isValidActuatorQuantityForSave = (quantity: unknown): boolean =>
  typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 0 && quantity <= 3;

const isValidActuatorSize = (size: unknown): boolean =>
  size === 'small' || size === 'medium' || size === 'large';
