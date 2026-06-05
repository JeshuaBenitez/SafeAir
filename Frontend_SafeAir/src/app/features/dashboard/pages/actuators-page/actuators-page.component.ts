import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';

@Component({
  selector: 'sa-actuators-page',
  standalone: true,
  imports: [AsyncPipe, NgIf, DashboardSidebarComponent, DashboardTopbarComponent],
  templateUrl: './actuators-page.component.html',
  styleUrl: './actuators-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActuatorsPageComponent {
  readonly viewModel$ = this.dashboardFacade.viewModel$;

  constructor(private readonly dashboardFacade: DashboardFacade) {}
}
