import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'sa-dashboard-humidity-widget',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard-humidity-widget.component.html',
  styleUrl: './dashboard-humidity-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardHumidityWidgetComponent {
  @Input({ required: true }) humidityPct = 50;

  private readonly centerX = 80;
  private readonly centerY = 82;
  readonly radius = 62;
  readonly circumference = Math.PI * this.radius;

  get clampedHumidity(): number {
    return Math.max(0, Math.min(100, this.humidityPct));
  }

  get dashOffset(): number {
    return this.circumference * (1 - this.clampedHumidity / 100);
  }

  get markerTipX(): number {
    return this.toPoint(this.radius).x;
  }

  get markerTipY(): number {
    return this.toPoint(this.radius).y;
  }

  get markerNeedleInnerX(): number {
    return this.toPoint(this.radius - 10).x;
  }

  get markerNeedleInnerY(): number {
    return this.toPoint(this.radius - 10).y;
  }

  get markerNeedleOuterX(): number {
    return this.toPoint(this.radius - 24).x;
  }

  get markerNeedleOuterY(): number {
    return this.toPoint(this.radius - 24).y;
  }

  private toPoint(radius: number): { x: number; y: number } {
    const radians = Math.PI * (1 - this.clampedHumidity / 100);

    return {
      x: this.centerX + radius * Math.cos(radians),
      y: this.centerY - radius * Math.sin(radians),
    };
  }
}
