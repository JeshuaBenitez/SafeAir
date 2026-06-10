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

interface MetricsHistoryRow {
  readonly id?: string;
  readonly roomId?: string;
  readonly cycleId?: string;
  readonly temperature: number;
  readonly humidity: number;
  readonly co2: number;
  readonly pm25: number;
  readonly measuredAt: string;
  readonly receivedAt?: string;
  readonly source?: string;
  readonly minisplitCount: number;
  readonly purifierCount: number;
  readonly extractorCount: number;
}

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
  readonly historyData$ = new BehaviorSubject<MetricsHistoryRow[]>([]);
  
  historyRangeLabel = '';
  selectedRoomId: string | null = null;
  private activeHistoryRequestKey = '';

  selectedTelemetryDate = this.formatDateForInput(new Date());
  selectedTelemetryTime = this.formatTimeForInput(new Date());

  // Variables para el modo reporte
  startDate = this.formatDateForInput(new Date());
  startHour = '09';
  startMinute = '00';

  endDate = this.formatDateForInput(new Date());
  endHour = '10';
  endMinute = '00';

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
          this.applyTimeRange();
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
    this.endDate = this.formatDateForInput(new Date());
    this.endHour = '10';
    this.endMinute = '00';
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

    const [hour = '00', minute = '00'] = time.split(':');
    const fromStr = this.buildFullDateTime(date, '00', '00');
    const toStr = this.buildFullDateTime(date, hour, minute);
    this.historyRangeLabel = `Reporte del ${this.formatInputDateTime(date, '00', '00')} al ${this.formatInputDateTime(date, hour, minute)}`;
    this.loadHistoryWithRange(fromStr, toStr);
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

    const startHour = this.normalizeTimePart(this.startHour, 0, 23);
    const startMinute = this.normalizeTimePart(this.startMinute, 0, 59);
    const endHour = this.normalizeTimePart(this.endHour, 0, 23);
    const endMinute = this.normalizeTimePart(this.endMinute, 0, 59);
    const startDateTime = this.buildFullDateTime(this.startDate, startHour, startMinute);
    const endDateTime = this.buildFullDateTime(this.endDate, endHour, endMinute);

    console.debug('[Reports] apply range clicked', {
      roomId: this.selectedRoomId,
      startDate: this.startDate,
      startHour,
      startMinute,
      endDate: this.endDate,
      endHour,
      endMinute,
      from: startDateTime,
      to: endDateTime,
    });

    this.historyRangeLabel = `Reporte del ${this.formatInputDateTime(this.startDate, startHour, startMinute)} al ${this.formatInputDateTime(this.endDate, endHour, endMinute)}`;
    this.loadHistoryWithRange(startDateTime, endDateTime);
  }

  private validateTimeRange(): string {
    // ── Validar formato de hora (formato 24 horas HH:mm) ──────────────────────
    // Hour debe ser 0-23, minute debe ser 0-59
    const validateField = (value: string | number, min: number, max: number, label: string): string => {
      const rawValue = String(value ?? '').trim();

      // Si está vacío o no es número, rechazar
      if (!rawValue || !/^\d+$/.test(rawValue)) {
        return `${label} es requerido y debe ser un número.`;
      }
      const num = parseInt(rawValue, 10);
      if (isNaN(num)) return `${label} debe ser un número válido.`;
      if (num < min || num > max) return `${label} debe estar entre ${min} y ${max}.`;
      return '';
    };

    // Validar inicio (formato 24h: 0-23 hora, 0-59 minuto)
    let err = validateField(this.startHour, 0, 23, 'Hora inicio');
    if (err) return err;
    err = validateField(this.startMinute, 0, 59, 'Minuto inicio');
    if (err) return err;

    // Validar fin (formato 24h: 0-23 hora, 0-59 minuto)
    err = validateField(this.endHour, 0, 23, 'Hora fin');
    if (err) return err;
    err = validateField(this.endMinute, 0, 59, 'Minuto fin');
    if (err) return err;

    // Construir fechas completas (formato 24h)
    const startDateTime = this.buildFullDateTimeObj(this.startDate, this.startHour, this.startMinute);
    const endDateTime = this.buildFullDateTimeObj(this.endDate, this.endHour, this.endMinute);

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

  private buildFullDateTime(dateStr: string, hour: string, minute: string): string {
    const dateTime = this.buildFullDateTimeObj(dateStr, hour, minute);
    return dateTime.toISOString();
  }

  private buildFullDateTimeObj(dateStr: string, hour: string, minute: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    const h = parseInt(this.normalizeTimePart(hour, 0, 23), 10);
    const m = parseInt(this.normalizeTimePart(minute, 0, 59), 10);
    return new Date(year, month - 1, day, h, m, 0, 0);
  }

  private loadHistoryWithRange(startDateTimeISO: string, endDateTimeISO: string): void {
    const roomId = this.selectedRoomId;

    if (!roomId) {
      this.rangeError = 'Selecciona una habitación primero.';
      return;
    }

    const fromStr = startDateTimeISO;
    const toStr = endDateTimeISO;
    const endpoint = `/api/v1/rooms/${roomId}/metrics/history`;
    const params = { from: fromStr, to: toStr };
    const finalUrl = this.buildDebugUrl(endpoint, params);
    const requestKey = `${roomId}|${fromStr}|${toStr}`;

    this.activeHistoryRequestKey = requestKey;

    this.environmentMockState.pauseTelemetry();
    this.isHistoryMode$.next(true);

    console.debug('[Reports] metrics history request', {
      roomId,
      from: fromStr,
      to: toStr,
      url: finalUrl,
    });

    this.apiClient
      .get<unknown>(endpoint, { params })
      .then((response) => {
        if (this.activeHistoryRequestKey !== requestKey) {
          console.debug('[Reports] stale history response ignored', { roomId, from: fromStr, to: toStr });
          return;
        }

        const rows = this.normalizeHistoryRows(response.data);

        console.debug('[Reports] metrics history response', {
          roomId,
          from: fromStr,
          to: toStr,
          url: finalUrl,
          receivedCount: rows.length,
          firstMeasuredAt: rows[0]?.measuredAt,
          lastMeasuredAt: rows[rows.length - 1]?.measuredAt,
        });

        this.historyData$.next(rows);
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

    const headers = ['Fecha y Hora (CDMX)', 'Temperatura (°C)', 'Humedad (%)', 'CO2 (ppm)', 'PM2.5 (µg/m³)', 'Dispositivos'];
    const rows = data.map(item => [
      this.formatDateLocal(item.measuredAt),
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
    const now = this.formatDateLocal(new Date().toISOString());

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
                <th>Fecha y Hora (CDMX)</th>
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
                  <td>${this.formatDateLocal(item.measuredAt)}</td>
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

  private normalizeTimePart(value: string | number, min: number, max: number): string {
    const numeric = parseInt(String(value ?? '').trim(), 10);
    const safeValue = Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;

    return String(safeValue).padStart(2, '0');
  }

  private formatInputDateTime(date: string, hour: string | number, minute: string | number): string {
    const [year, month, day] = date.split('-');
    const safeDate = year && month && day ? `${day}/${month}/${year}` : date;

    return `${safeDate} ${this.normalizeTimePart(hour, 0, 23)}:${this.normalizeTimePart(minute, 0, 59)}`;
  }

  private buildDebugUrl(endpoint: string, params: { from: string; to: string }): string {
    const baseUrl = (this.apiClient as unknown as { getBaseUrl?: () => string }).getBaseUrl?.() ?? '';
    const query = new URLSearchParams(params).toString();

    return `${baseUrl}${endpoint}?${query}`;
  }

  private normalizeHistoryRows(payload: unknown): MetricsHistoryRow[] {
    const rawRows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { data?: unknown[] })?.data)
        ? (payload as { data: unknown[] }).data
        : Array.isArray((payload as { records?: unknown[] })?.records)
          ? (payload as { records: unknown[] }).records
          : [];

    return rawRows
      .map((item) => this.mapHistoryRow(item))
      .filter((row): row is MetricsHistoryRow => Boolean(row?.measuredAt))
      .sort((a, b) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime());
  }

  private mapHistoryRow(item: unknown): MetricsHistoryRow | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const row = item as Record<string, unknown>;

    return {
      id: typeof row['id'] === 'string' ? row['id'] : undefined,
      roomId: typeof row['roomId'] === 'string' ? row['roomId'] : undefined,
      cycleId: typeof row['cycleId'] === 'string' ? row['cycleId'] : undefined,
      temperature: this.toNumber(row['temperature']),
      humidity: this.toNumber(row['humidity']),
      co2: this.toNumber(row['co2']),
      pm25: this.toNumber(row['pm25']),
      measuredAt: String(row['measuredAt'] ?? ''),
      receivedAt: typeof row['receivedAt'] === 'string' ? row['receivedAt'] : undefined,
      source: typeof row['source'] === 'string' ? row['source'] : undefined,
      minisplitCount: this.toNumber(row['minisplitCount']),
      purifierCount: this.toNumber(row['purifierCount']),
      extractorCount: this.toNumber(row['extractorCount']),
    };
  }

  private toNumber(value: unknown): number {
    const numeric = Number(value);

    return Number.isFinite(numeric) ? numeric : 0;
  }

  private formatDevices(item: MetricsHistoryRow): string {
    const devices = [];
    if (item.minisplitCount > 0) devices.push(`${item.minisplitCount} Minisplit${item.minisplitCount > 1 ? 's' : ''}`);
    if (item.purifierCount > 0) devices.push(`${item.purifierCount} Purificador${item.purifierCount > 1 ? 'es' : ''}`);
    if (item.extractorCount > 0) devices.push(`${item.extractorCount} Extractor${item.extractorCount > 1 ? 'es' : ''}`);
    return devices.length > 0 ? devices.join(', ') : 'Sin dispositivos';
  }

  /**
   * Format ISO date string to CDMX local time.
   * Uses timezone America/Mexico_City consistently.
   */
  formatDateLocal(isoString: string | null | undefined): string {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
    } catch {
      return isoString;
    }
  }
}
