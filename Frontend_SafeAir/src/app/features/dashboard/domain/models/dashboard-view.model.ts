import { DashboardMetrics } from './dashboard-metrics.model';
import { DashboardRoom } from './dashboard-room.model';
import { DashboardUser } from './dashboard-user.model';

export interface DashboardViewModel {
  readonly locationLabel: string;
  readonly user: DashboardUser;
  readonly metrics: DashboardMetrics;
  readonly rooms: readonly DashboardRoom[];
}
