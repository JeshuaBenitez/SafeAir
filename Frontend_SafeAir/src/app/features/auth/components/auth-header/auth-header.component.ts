import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'sa-auth-header',
  standalone: true,
  templateUrl: './auth-header.component.html',
  styleUrl: './auth-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthHeaderComponent {}
