import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'sa-dashboard-temperature-widget',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './dashboard-temperature-widget.component.html',
  styleUrl: './dashboard-temperature-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTemperatureWidgetComponent {
  @Input({ required: true }) temperatureC = 22;

  readonly minTemperatureC = 18;
  readonly maxTemperatureC = 32;

  get fillHeightPct(): number {
    const normalized =
      ((this.temperatureC - this.minTemperatureC) /
        (this.maxTemperatureC - this.minTemperatureC)) *
      100;

    return Math.max(0, Math.min(100, normalized));
  }

  get statusLabel(): string {
    if (this.temperatureC < 20) {
      return 'Frio';
    }

    if (this.temperatureC <= 26) {
      return 'Confort';
    }

    return 'Calido';
  }
}