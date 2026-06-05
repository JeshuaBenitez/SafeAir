import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-metric-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-metric-card.component.html',
  styleUrl: './dashboard-metric-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetricCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() unit = '';
  @Input() icon = 'assets/icons/area.png';
}