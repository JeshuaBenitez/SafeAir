import { Route } from '@angular/router';

import { authRedirectGuard } from '@core/guards/auth-redirect.guard';
import { LoginPageComponent } from './pages/login-page/login-page.component';
import { RegisterPageComponent } from './pages/register-page/register-page.component';

export const AUTH_ROUTES: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    canActivate: [authRedirectGuard],
    component: LoginPageComponent,
  },
  {
    path: 'register',
    canActivate: [authRedirectGuard],
    component: RegisterPageComponent,
  },
];
