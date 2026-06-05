import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AuthCardComponent } from '@shared/ui/auth-card/auth-card.component';
import { AuthShellComponent } from '@shared/ui/page-shell/auth-shell.component';

@Component({
  selector: 'sa-login-placeholder-page',
  standalone: true,
  imports: [AuthShellComponent, AuthCardComponent],
  template: `
    <sa-auth-shell>
      <sa-auth-card
        title="Login foundation ready"
        subtitle="Next batch will attach the real login form over this shared base."
      />
    </sa-auth-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPlaceholderPageComponent {}
