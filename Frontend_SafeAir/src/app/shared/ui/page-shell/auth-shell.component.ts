import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'sa-auth-shell',
  standalone: true,
  imports: [NgIf],
  templateUrl: './auth-shell.component.html',
  styleUrl: './auth-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
  @Input() showBrandHeader = true;
  @Input() compact = false;
  @Input() footerText = '&copy; 2026 SafeAir emulator';
}
