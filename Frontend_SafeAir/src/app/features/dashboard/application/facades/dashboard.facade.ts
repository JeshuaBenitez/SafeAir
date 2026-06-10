import { Injectable } from '@angular/core';
import { map } from 'rxjs';

import {
  DASHBOARD_MOCK_LOCATION,
  DASHBOARD_MOCK_USER,
} from '@features/dashboard/data/mock/dashboard-mock-state';
import { CreateRoomDraft } from '@features/dashboard/domain/models/create-room-draft.model';
import { DashboardMetrics } from '@features/dashboard/domain/models/dashboard-metrics.model';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';
import { DashboardViewModel } from '@features/dashboard/domain/models/dashboard-view.model';
import {
  AddRoomResult,
  DashboardMockStateService,
  MAX_ROOMS_PER_DASHBOARD,
  RemoveRoomResult,
} from '@features/dashboard/application/services/dashboard-mock-state.service';
import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';

@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  readonly maxRoomsPerDashboard = MAX_ROOMS_PER_DASHBOARD;

  readonly viewModel$ = this.dashboardMockState.rooms$.pipe(
    map((rooms): DashboardViewModel => {
      const session = this.authSessionStorage.getSession();
      
      const savedFirstName = localStorage.getItem('safeair.user.firstName');
      const savedLastName = localStorage.getItem('safeair.user.lastName');
      const savedAvatar = localStorage.getItem('safeair.user.profileImage');

      const displayName = savedFirstName && savedLastName
        ? `${savedFirstName} ${savedLastName}`
        : (session?.displayName || 'Usuario');

      const avatarUrl = savedAvatar || 'assets/images/userprofile.png';

      return {
        locationLabel: DASHBOARD_MOCK_LOCATION,
        user: {
          displayName,
          statusLabel: 'CONECTADO',
          avatarUrl,
        },
        metrics: this.computeMetrics(rooms),
        rooms,
      };
    }),
  );

  constructor(
    private readonly dashboardMockState: DashboardMockStateService,
    private readonly authSessionStorage: AuthSessionStorageService,
  ) {
    this.dashboardMockState.refreshRooms();
  }

  async addRoom(draft: CreateRoomDraft): Promise<AddRoomResult> {
    return this.dashboardMockState.addRoom(draft);
  }

  async removeRoom(roomId: string): Promise<RemoveRoomResult> {
    return this.dashboardMockState.removeRoom(roomId);
  }

  hasRoomCapacity(): boolean {
    return this.dashboardMockState.hasRoomCapacity();
  }

  refreshRooms(): void {
    this.dashboardMockState.refreshRooms();
  }

  private computeMetrics(rooms: readonly DashboardRoom[]): DashboardMetrics {
    const totalAreaM2 = rooms.reduce((sum, room) => sum + room.areaM2, 0);
    const totalWindows = rooms.reduce((sum, room) => sum + room.windowsCount, 0);
    const activeActuators = rooms.reduce(
      (sum, room) => room.hasEmulator === false
        ? sum
        : sum + room.actuators.minisplit.quantity + room.actuators.purifier.quantity + room.actuators.extractor.quantity,
      0,
    );

    return {
      totalRooms: rooms.length,
      activeActuators,
      totalAreaM2,
      totalWindows,
    };
  }
}
