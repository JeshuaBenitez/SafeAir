import { Route } from '@angular/router';
import { authSessionGuard } from '@core/guards/auth-session.guard';
import { ActuatorsPageComponent } from '@features/dashboard/pages/actuators-page/actuators-page.component';
import { DashboardPageComponent } from '@features/dashboard/pages/dashboard-page/dashboard-page.component';
import { DashboardViewPageComponent } from '@features/dashboard/pages/dashboard-view-page/dashboard-view-page.component';
import { RoomControlPageComponent } from '@features/dashboard/pages/room-control-page/room-control-page.component';
import { RoomsPageComponent } from '@features/dashboard/pages/rooms-page/rooms-page.component';
import { SettingsPageComponent } from '@features/dashboard/pages/settings-page/settings-page.component';

export const APP_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authSessionGuard],
    component: DashboardPageComponent,
  },
  {
    path: 'dashboard-view',
    canActivate: [authSessionGuard],
    component: DashboardViewPageComponent,
  },
  {
    path: 'rooms',
    canActivate: [authSessionGuard],
    component: RoomsPageComponent,
  },
  {
    path: 'rooms/:id/control',
    canActivate: [authSessionGuard],
    component: RoomControlPageComponent,
  },
  {
    path: 'actuators',
    canActivate: [authSessionGuard],
    component: ActuatorsPageComponent,
  },
  {
    path: 'settings',
    canActivate: [authSessionGuard],
    component: SettingsPageComponent,
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];