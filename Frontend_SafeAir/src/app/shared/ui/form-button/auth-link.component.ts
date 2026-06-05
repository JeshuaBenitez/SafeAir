import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'sa-auth-link',
  standalone: true,
  imports: [RouterLink],
  template: '<a class="auth-link" [routerLink]="to">{{ label }}</a>',
  styleUrl: './auth-link.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLinkComponent {
  @Input({ required: true }) to = '';
  @Input({ required: true }) label = '';
}
