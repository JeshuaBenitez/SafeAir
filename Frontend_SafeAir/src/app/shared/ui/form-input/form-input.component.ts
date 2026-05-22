import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'sa-form-input',
  standalone: true,
  imports: [NgIf, NgClass, ReactiveFormsModule],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormInputComponent {
  @Input({ required: true }) id = '';
  @Input({ required: true }) label = '';
  @Input({ required: true }) control!: FormControl<string>;
  @Input() type: 'text' | 'email' = 'text';
  @Input() placeholder = '';
  @Input() leftIconSrc?: string;
  @Input() leftIconAlt = '';
  @Input() hint?: string;
  @Input() error?: string;
  @Input() autocomplete = 'off';
}
