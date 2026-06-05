import { Injectable, inject } from '@angular/core';

import { AuthCredentials } from '../models/auth-credentials.model';
import { LoginResult } from '../models/login-result.model';
import { AUTH_REPOSITORY } from '../ports/auth-repository.port';

@Injectable({ providedIn: 'root' })
export class LoginUseCase {
  private readonly authRepository = inject(AUTH_REPOSITORY);

  execute(credentials: AuthCredentials): Promise<LoginResult> {
    return this.authRepository.login(credentials);
  }
}
