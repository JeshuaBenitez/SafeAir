import { AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { DashboardEnvironmentMockService } from '@features/dashboard/application/services/dashboard-environment-mock.service';
import { DashboardCo2WidgetComponent } from '@features/dashboard/components/dashboard-co2-widget/dashboard-co2-widget.component';
import { DashboardHumidityWidgetComponent } from '@features/dashboard/components/dashboard-humidity-widget/dashboard-humidity-widget.component';
import { DashboardPm25WidgetComponent } from '@features/dashboard/components/dashboard-pm25-widget/dashboard-pm25-widget.component';
import { DashboardRoomSelectorComponent } from '@features/dashboard/components/dashboard-room-selector/dashboard-room-selector.component';
import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTemperatureWidgetComponent } from '@features/dashboard/components/dashboard-temperature-widget/dashboard-temperature-widget.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';

@Component({
  selector: 'sa-dashboard-view-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    DashboardSidebarComponent,
    DashboardTopbarComponent,
    DashboardRoomSelectorComponent,
    DashboardTemperatureWidgetComponent,
    DashboardHumidityWidgetComponent,
    DashboardCo2WidgetComponent,
    DashboardPm25WidgetComponent,
  ],
  templateUrl: './dashboard-view-page.component.html',
  styleUrl: './dashboard-view-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardViewPageComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly viewModel$ = this.dashboardFacade.viewModel$;
  readonly environmentViewModel$ = this.environmentMockState.viewModel$;

  selectedTelemetryDate = this.formatDateForInput(new Date());
  selectedTelemetryTime = this.formatTimeForInput(new Date());

  constructor(
    private readonly dashboardFacade: DashboardFacade,
    private readonly environmentMockState: DashboardEnvironmentMockService,
  ) {
    this.viewModel$
      .pipe(
        map((vm) => vm.rooms),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rooms) => {
        this.environmentMockState.setRooms(rooms);
      });
  }

  selectRoom(roomId: string): void {
    this.environmentMockState.selectRoom(roomId);
  }

  onTelemetryDateTimeApplied(selection: { date: string; time: string }): void {
    this.selectedTelemetryDate = selection.date;
    this.selectedTelemetryTime = selection.time;

    // Aquí después podrás conectar la lógica real para filtrar historial/telemetría.
    console.log('Fecha/Hora seleccionada:', selection);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
}