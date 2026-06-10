import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard-room-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-room-card.component.html',
  styleUrl: './dashboard-room-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardRoomCardComponent implements OnChanges {
  private readonly router = inject(Router);

  @Input({ required: true }) room: any;
  @Input() index = 0;
  @Output() deleteRequested = new EventEmitter<string>();

  imageUrl = 'assets/images/sala.png';
  isActive = false;
  statusLabel = 'Sin emulador asignado';
  displayTemperature = '--°C';
  actuatorsCount = 0;

  minisplitCount = 0;
  purifierCount = 0;
  extractorCount = 0;

  private readonly images = [
    'assets/images/sala.png',
    'assets/images/cocina.png',
    'assets/images/comedor.png',
    'assets/images/habitacion.png',
  ];

  ngOnChanges(): void {
    this.imageUrl =
      this.room?.imageSrc ||
      this.room?.dashboardImage ||
      this.images[this.index % this.images.length];

    this.minisplitCount = Number(
      this.room?.actuators?.minisplit?.quantity ??
      this.room?.miniSplitQuantity ??
      0,
    );

    this.purifierCount = Number(
      this.room?.actuators?.purifier?.quantity ??
      this.room?.purifierQuantity ??
      0,
    );

    this.extractorCount = Number(
      this.room?.actuators?.extractor?.quantity ??
      this.room?.extractorQuantity ??
      0,
    );

    this.actuatorsCount =
      this.minisplitCount +
      this.purifierCount +
      this.extractorCount;

    this.isActive = this.room?.hasEmulator !== false;
    const latestMetrics = this.room?.latestMetrics;
    const hasTemperature = typeof latestMetrics?.temperature === 'number';

    if (!this.isActive) {
      this.statusLabel = 'SIN EMULADOR ASIGNADO';
      this.displayTemperature = '--°C';
      return;
    }

    this.statusLabel = hasTemperature ? 'TELEMETRÍA ACTIVA' : 'ESPERANDO TELEMETRÍA';
    this.displayTemperature = hasTemperature
      ? `${Number(latestMetrics.temperature).toFixed(1)}°C`
      : '--°C';
  }

  goToControl(): void {
    const roomId =
      this.room?.id ??
      this.room?.name ??
      this.room?.designation ??
      this.index;

    this.router.navigate(['/rooms', roomId, 'control']);
  }

  requestDelete(event: Event): void {
    event.stopPropagation();

    const roomId = this.room?.id;
    if (typeof roomId !== 'string' || roomId.length === 0) {
      return;
    }

    this.deleteRequested.emit(roomId);
  }
}
