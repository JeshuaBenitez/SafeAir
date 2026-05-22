import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthSessionStorageService } from '@features/auth/application/services/auth-session-storage.service';

export const authRedirectGuard: CanActivateFn = () => {
  const sessionStorage = inject(AuthSessionStorageService);
  const router = inject(Router);

  if (sessionStorage.hasActiveSession()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};