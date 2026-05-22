import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardSidebarComponent } from '../../components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '../../components/dashboard-topbar/dashboard-topbar.component';
import { DashboardMetricCardComponent } from '../../components/dashboard-metric-card/dashboard-metric-card.component';
import { DashboardRoomCardComponent } from '../../components/dashboard-room-card/dashboard-room-card.component';
import { DashboardEmptyStateComponent } from '../../components/dashboard-empty-state/dashboard-empty-state.component';
import { DashboardFacade } from '../../application/facades/dashboard.facade';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    DashboardSidebarComponent,
    DashboardTopbarComponent,
    DashboardMetricCardComponent,
    DashboardRoomCardComponent,
    DashboardEmptyStateComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly facade = inject(DashboardFacade);
  readonly viewModel$ = this.facade.viewModel$;

  trackByRoom = (_index: number, room: any): string =>
    room?.id ?? room?.name ?? room?.designation ?? String(_index);

  onDeleteRoom(roomId: string): void {
    this.facade.removeRoom(roomId);
  }
}