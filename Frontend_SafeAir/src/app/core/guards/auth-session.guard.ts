import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';
import { API_CLIENT } from '@core/config/api-client.token';
import { environment } from '../../../environments/environment';

export const authSessionGuard: CanActivateFn = () => {
  const sessionStorage = inject(AuthSessionStorageService);
  const router = inject(Router);
  const apiClient = inject(API_CLIENT);

  const session = sessionStorage.getSession();

  if (session) {
    if (environment.features.jwtInterceptor) {
      apiClient.setAuthToken(session.accessToken);
    }
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
