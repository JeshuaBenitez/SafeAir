import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'sa-password-input',
  standalone: true,
  imports: [NgIf, ReactiveFormsModule],
  templateUrl: './password-input.component.html',
  styleUrl: './password-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordInputComponent {
  @Input({ required: true }) id = '';
  @Input({ required: true }) label = '';
  @Input({ required: true }) control!: FormControl<string>;
  @Input() placeholder = '';
  @Input() leftIconSrc = 'assets/icons/candado.png';
  @Input() eyeIconSrc = 'assets/icons/ojo.png';
  @Input() error?: string;

  visible = false;

  toggleVisibility(): void {
    this.visible = !this.visible;
  }
}
