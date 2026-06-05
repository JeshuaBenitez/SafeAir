import { DashboardUser } from '@features/dashboard/domain/models/dashboard-user.model';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';

export const DASHBOARD_MOCK_USER: DashboardUser = {
  displayName: 'Admin',
  statusLabel: 'CONECTADO',
};

export const DASHBOARD_MOCK_LOCATION = 'Rooms > Master Suite Emulator';

export const DASHBOARD_INITIAL_ROOMS: readonly DashboardRoom[] = [];
