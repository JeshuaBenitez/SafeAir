import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { DashboardUser } from '@features/dashboard/domain/models/dashboard-user.model';

interface DashboardSidebarItem {
  readonly label: string;
  readonly iconSrc: string;
  readonly to: string;
}

@Component({
  selector: 'sa-dashboard-sidebar',
  standalone: true,
  imports: [NgFor, RouterLink],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardSidebarComponent {
  @Input({ required: true }) user!: DashboardUser;

  readonly menuItems: readonly DashboardSidebarItem[] = [
    { label: 'Inicio', iconSrc: 'assets/icons/cuadros.png', to: '/dashboard' },
    { label: 'Dashboard', iconSrc: 'assets/icons/area.png', to: '/dashboard-view' },
    { label: 'Cuartos', iconSrc: 'assets/icons/cuarto.png', to: '/rooms' },

    { label: 'Configuración', iconSrc: 'assets/icons/tuerca.svg', to: '/settings' },
  ];

  constructor(private readonly router: Router) {}

  isItemActive(item: DashboardSidebarItem): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];

    if (item.label === 'Inicio') {
      return currentPath === '/dashboard';
    }

    if (item.label === 'Dashboard') {
      return currentPath === '/dashboard-view';
    }

    if (item.label === 'Cuartos') {
      return currentPath === '/rooms' || currentPath.startsWith('/rooms/');
    }

    if (item.label === 'Configuración') {
      return currentPath === '/settings' || currentPath.startsWith('/settings/');
    }

    return false;
  }
}
