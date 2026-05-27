import { Injectable, inject } from '@angular/core';

import { RegisterDraft } from '../models/register-draft.model';
import { AuthError } from '../models/auth-error.model';
import { AUTH_REPOSITORY } from '../ports/auth-repository.port';

@Injectable({ providedIn: 'root' })
export class RegisterUseCase {
  private readonly authRepository = inject(AUTH_REPOSITORY);

  execute(draft: RegisterDraft): Promise<{ ok: boolean; error?: AuthError }> {
    return this.authRepository.register(draft);
  }
}
