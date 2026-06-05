import { AsyncPipe, NgIf, NgFor, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map } from 'rxjs';

import { DashboardEnvironmentMockService } from '@features/dashboard/application/services/dashboard-environment-mock.service';
import { DashboardCo2WidgetComponent } from '@features/dashboard/components/dashboard-co2-widget/dashboard-co2-widget.component';
import { DashboardHumidityWidgetComponent } from '@features/dashboard/components/dashboard-humidity-widget/dashboard-humidity-widget.component';
import { DashboardPm25WidgetComponent } from '@features/dashboard/components/dashboard-pm25-widget/dashboard-pm25-widget.component';
import { DashboardRoomSelectorComponent } from '@features/dashboard/components/dashboard-room-selector/dashboard-room-selector.component';
import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardSidebarComponent } from '@features/dashboard/components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTemperatureWidgetComponent } from '@features/dashboard/components/dashboard-temperature-widget/dashboard-temperature-widget.component';
import { DashboardTopbarComponent } from '@features/dashboard/components/dashboard-topbar/dashboard-topbar.component';
import { API_CLIENT } from '@core/config/api-client.token';

@Component({
  selector: 'sa-dashboard-view-page',
  standalone: true,
  imports: [
    AsyncPipe,
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
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
  private readonly apiClient = inject(API_CLIENT);

  readonly viewModel$ = this.dashboardFacade.viewModel$;
  readonly environmentViewModel$ = this.environmentMockState.viewModel$;

  readonly isHistoryMode$ = new BehaviorSubject<boolean>(false);
  readonly historyData$ = new BehaviorSubject<any[]>([]);
  
  historyRangeLabel = '';
  selectedRoomId: string | null = null;

  selectedTelemetryDate = this.formatDateForInput(new Date());
  selectedTelemetryTime = this.formatTimeForInput(new Date());

  // Variables para el modo reporte
  startDate = this.formatDateForInput(new Date());
  startHour = '09';
  startMinute = '00';
  startPeriod: 'AM' | 'PM' = 'AM';

  endDate = this.formatDateForInput(new Date());
  endHour = '10';
  endMinute = '00';
  endPeriod: 'AM' | 'PM' = 'AM';

  rangeError = '';

  constructor(
    private readonly dashboardFacade: DashboardFacade,
    private readonly environmentMockState: DashboardEnvironmentMockService,
  ) {
    this.dashboardFacade.refreshRooms();

    this.viewModel$
      .pipe(
        map((vm) => vm.rooms),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rooms) => {
        this.environmentMockState.setRooms(rooms);
      });

    this.environmentViewModel$
      .pipe(
        map((vm) => vm.selectedRoomId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((roomId) => {
        const previousId = this.selectedRoomId;
        this.selectedRoomId = roomId;
        
        if (this.isHistoryMode$.value && roomId && roomId !== previousId) {
          this.loadHistoryData(this.selectedTelemetryDate, this.selectedTelemetryTime);
        }
      });
  }

  selectRoom(roomId: string): void {
    this.environmentMockState.selectRoom(roomId);
  }

  openReportMode(): void {
    // Inicializar fechas con valores por defecto
    this.startDate = this.formatDateForInput(new Date());
    this.startHour = '09';
    this.startMinute = '00';
    this.startPeriod = 'AM';
    this.endDate = this.formatDateForInput(new Date());
    this.endHour = '10';
    this.endMinute = '00';
    this.endPeriod = 'AM';
    this.rangeError = '';

    this.environmentMockState.pauseTelemetry();
    this.isHistoryMode$.next(true);
    this.historyData$.next([]);
    this.historyRangeLabel = 'Selecciona el rango de fechas y aplica para generar el reporte';
  }

  onTelemetryDateTimeApplied(selection: { date: string; time: string }): void {
    this.selectedTelemetryDate = selection.date;
    this.selectedTelemetryTime = selection.time;
    this.loadHistoryData(selection.date, selection.time);
  }

  clearHistoryFilter(): void {
    this.isHistoryMode$.next(false);
    this.historyData$.next([]);
    this.environmentMockState.resumeTelemetry();

    this.selectedTelemetryDate = this.formatDateForInput(new Date());
    this.selectedTelemetryTime = this.formatTimeForInput(new Date());
    this.historyRangeLabel = '';
  }

  getTemperatureClass(value: number): string {
    if (value >= 18 && value <= 25) return 'metric-badge--optimal';
    if ((value >= 15 && value < 18) || (value > 25 && value <= 28)) return 'metric-badge--stable';
    return 'metric-badge--alert';
  }

  getCo2Class(value: number): string {
    if (value <= 700) return 'metric-badge--optimal';
    if (value <= 950) return 'metric-badge--stable';
    return 'metric-badge--alert';
  }

  getPm25Class(value: number): string {
    if (value <= 20) return 'metric-badge--optimal';
    if (value <= 40) return 'metric-badge--stable';
    return 'metric-badge--alert';
  }

  private loadHistoryData(date: string, time: string): void {
    if (!this.selectedRoomId) {
      return;
    }

    const fromStr = `${date}T00:00:00.000Z`;
    const toStr = `${date}T${time}.000Z`;

    this.environmentMockState.pauseTelemetry();
    this.isHistoryMode$.next(true);
    
    const parts = date.split('-');
    const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
    this.historyRangeLabel = `Mostrando historial del ${formattedDate} hasta las ${time}`;

    this.apiClient
      .get<any[]>(`/api/v1/rooms/${this.selectedRoomId}/metrics/history?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`)
      .then((response) => {
        const sorted = [...response.data].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
        this.historyData$.next(sorted);
      })
      .catch((error) => {
        console.error('Error cargando historial de metras:', error);
        this.historyData$.next([]);
      });
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

  applyTimeRange(): void {
    this.rangeError = '';
    const error = this.validateTimeRange();

    if (error) {
      this.rangeError = error;
      return;
    }

    const startDateTime = this.buildFullDateTime(this.startDate, this.startHour, this.startMinute, this.startPeriod);
    const endDateTime = this.buildFullDateTime(this.endDate, this.endHour, this.endMinute, this.endPeriod);

    this.loadHistoryWithRange(startDateTime, endDateTime);
  }

  private validateTimeRange(): string {
    // Construir fechas completas
    const startDateTime = this.buildFullDateTimeObj(this.startDate, this.startHour, this.startMinute, this.startPeriod);
    const endDateTime = this.buildFullDateTimeObj(this.endDate, this.endHour, this.endMinute, this.endPeriod);

    // Validar que fin sea mayor que inicio
    if (endDateTime <= startDateTime) {
      return 'La fecha y hora de fin debe ser mayor que la fecha y hora de inicio.';
    }

    // Calcular diferencia en minutos
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const diffMinutes = diffMs / (60 * 1000);

    // Validar mínimo 20 minutos
    if (diffMinutes < 20) {
      return 'El rango mínimo permitido es de 20 minutos.';
    }

    // Validar máximo 30 días (límite razonable)
    const maxMinutes = 30 * 24 * 60;
    if (diffMinutes > maxMinutes) {
      return `El rango máximo permitido es de 30 días (${maxMinutes} minutos).`;
    }

    return '';
  }

  private buildFullDateTime(dateStr: string, hour: string, minute: string, period: 'AM' | 'PM'): string {
    const dateTime = this.buildFullDateTimeObj(dateStr, hour, minute, period);
    return dateTime.toISOString();
  }

  private buildFullDateTimeObj(dateStr: string, hour: string, minute: string, period: 'AM' | 'PM'): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    // Convertir de 12h a 24h
    if (period === 'AM' && h === 12) {
      h = 0;
    } else if (period === 'PM' && h !== 12) {
      h += 12;
    }

    return new Date(year, month - 1, day, h, m, 0, 0);
  }

  private timeToMilliseconds(hour: string, minute: string, period: 'AM' | 'PM'): number {
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    // Convertir de 12h a 24h
    if (period === 'AM' && h === 12) {
      h = 0;
    } else if (period === 'PM' && h !== 12) {
      h += 12;
    }

    return h * 3600000 + m * 60000;
  }

  private convertTo24hFormat(hour: string, minute: string, period: 'AM' | 'PM'): string {
    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (period === 'AM' && h === 12) {
      h = 0;
    } else if (period === 'PM' && h !== 12) {
      h += 12;
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  }

  private loadHistoryWithRange(startDateTimeISO: string, endDateTimeISO: string): void {
    if (!this.selectedRoomId) {
      this.rangeError = 'Selecciona una habitación primero.';
      return;
    }

    const fromStr = startDateTimeISO;
    const toStr = endDateTimeISO;

    this.environmentMockState.pauseTelemetry();
    this.isHistoryMode$.next(true);

    // Formatear label para mostrar al usuario
    const startDt = new Date(startDateTimeISO);
    const endDt = new Date(endDateTimeISO);
    const formatDateTime = (dt: Date) => {
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      const hour = String(dt.getHours()).padStart(2, '0');
      const minute = String(dt.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hour}:${minute}`;
    };

    this.historyRangeLabel = `Reporte del ${formatDateTime(startDt)} al ${formatDateTime(endDt)}`;

    this.apiClient
      .get<any[]>(`/api/v1/rooms/${this.selectedRoomId}/metrics/history?from=${encodeURIComponent(fromStr)}&to=${encodeURIComponent(toStr)}`)
      .then((response) => {
        const sorted = [...response.data].sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
        this.historyData$.next(sorted);
      })
      .catch((error) => {
        console.error('Error cargando historial:', error);
        this.historyData$.next([]);
      });
  }

  exportToCsv(): void {
    const data = this.historyData$.value;
    if (!data.length) {
      alert('No hay datos para exportar.');
      return;
    }

    const headers = ['Fecha y Hora', 'Temperatura (°C)', 'Humedad (%)', 'CO2 (ppm)', 'PM2.5 (µg/m³)', 'Dispositivos'];
    const rows = data.map(item => [
      new Date(item.measuredAt).toLocaleString('es-MX'),
      item.temperature,
      item.humidity,
      item.co2,
      item.pm25,
      this.formatDevices(item)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte-${this.selectedRoomId}-${new Date().getTime()}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  }

  exportToPdf(): void {
    const data = this.historyData$.value;
    if (!data.length) {
      alert('No hay datos para exportar.');
      return;
    }

    const roomId = this.selectedRoomId || 'Desconocida';
    const now = new Date().toLocaleString('es-MX');

    let html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #1a73e8; }
            .header p { margin: 5px 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #1a73e8; font-weight: bold; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; text-align: center; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Métricas Ambientales</h1>
            <p><strong>Sala:</strong> ${roomId}</p>
            <p><strong>Período:</strong> ${this.historyRangeLabel}</p>
            <p><strong>Generado:</strong> ${now}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Temperatura (°C)</th>
                <th>Humedad (%)</th>
                <th>CO2 (ppm)</th>
                <th>PM2.5 (µg/m³)</th>
                <th>Dispositivos</th>
              </tr>
            </thead>
            <tbody>
              ${data.map(item => `
                <tr>
                  <td>${new Date(item.measuredAt).toLocaleString('es-MX')}</td>
                  <td>${item.temperature}</td>
                  <td>${item.humidity}</td>
                  <td>${item.co2}</td>
                  <td>${item.pm25}</td>
                  <td>${this.formatDevices(item)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            <p>SafeAir - Sistema de Monitoreo de Calidad de Aire</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '', 'width=1000,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  }

  private formatDevices(item: any): string {
    const devices = [];
    if (item.minisplitCount > 0) devices.push(`${item.minisplitCount} Minisplit${item.minisplitCount > 1 ? 's' : ''}`);
    if (item.purifierCount > 0) devices.push(`${item.purifierCount} Purificador${item.purifierCount > 1 ? 'es' : ''}`);
    if (item.extractorCount > 0) devices.push(`${item.extractorCount} Extractor${item.extractorCount > 1 ? 'es' : ''}`);
    return devices.length > 0 ? devices.join(', ') : 'Sin dispositivos';
  }
}