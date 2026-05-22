import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sa-dashboard-empty-state',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard-empty-state.component.html',
  styleUrl: './dashboard-empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardEmptyStateComponent {}
