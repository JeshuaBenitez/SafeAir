import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { DASHBOARD_INITIAL_ROOMS } from '@features/dashboard/data/mock/dashboard-mock-state';
import { CreateRoomDraft } from '@features/dashboard/domain/models/create-room-draft.model';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';
import { RoomActuatorsMap } from '@features/dashboard/domain/models/room-actuator-config.model';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';

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
  private readonly roomsSubject = new BehaviorSubject<readonly DashboardRoom[]>([]);

  readonly rooms$ = this.roomsSubject.asObservable();

  constructor(private readonly authSessionStorage: AuthSessionStorageService) {
    this.roomsSubject.next(this.loadRooms());
  }

  getRoomCount(): number {
    return this.loadRooms().length;
  }

  hasRoomCapacity(): boolean {
    return this.getRoomCount() < MAX_ROOMS_PER_DASHBOARD;
  }

  addRoom(draft: CreateRoomDraft): AddRoomResult {
    const currentRooms = this.loadRooms();
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

  removeRoom(roomId: string): RemoveRoomResult {
    const currentRooms = this.loadRooms();
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

  refreshRooms(): void {
    this.roomsSubject.next(this.loadRooms());
  }

  private getCurrentUserId(): string | null {
    try {
      const session = this.authSessionStorage.getSession();
      return session?.userId || null;
    } catch {
      return null;
    }
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

  public loadRooms(): readonly DashboardRoom[] {
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
  typeof quantity === 'number' && Number.isInteger(quantity) && quantity >= 1 && quantity <= 3;

const isValidActuatorSize = (size: unknown): boolean =>
  size === 'small' || size === 'medium' || size === 'large';