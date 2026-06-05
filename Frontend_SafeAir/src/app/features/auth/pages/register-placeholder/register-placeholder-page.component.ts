import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';

@Component({
  selector: 'sa-register-placeholder-page',
  standalone: true,
  imports: [AuthShellComponent, AuthCardComponent],
  template: `
    <sa-auth-shell>
      <sa-auth-card
        title="Register foundation ready"
        subtitle="Future-ready register experience will be implemented in the next batch."
      />
    </sa-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPlaceholderPageComponent {}
