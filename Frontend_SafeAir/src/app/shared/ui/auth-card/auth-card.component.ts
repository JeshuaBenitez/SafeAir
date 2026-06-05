import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'sa-auth-card',
  standalone: true,
  imports: [NgIf],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCardComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle?: string;
}
