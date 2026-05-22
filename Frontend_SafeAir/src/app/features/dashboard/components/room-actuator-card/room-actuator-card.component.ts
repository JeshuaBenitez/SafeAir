import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActuatorSize } from '../../domain/models/actuator-size.model';

@Component({
  selector: 'sa-room-actuator-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room-actuator-card.component.html',
  styleUrl: './room-actuator-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoomActuatorCardComponent {
  @Input() type: 'minisplit' | 'purifier' | 'extractor' = 'minisplit';
  @Input() title = 'MiniSplit';
  @Input() subtitle = 'Regulación térmica';
  @Input() iconSrc = 'assets/icons/actuador.png';

  @Input() quantity = 1;
  @Input() size: ActuatorSize = 'small';
  @Input() showError = false;

  @Output() quantityChange = new EventEmitter<number>();
  @Output() sizeChange = new EventEmitter<ActuatorSize>();

  readonly quantities = [1, 2, 3] as const;
  readonly sizes: readonly ActuatorSize[] = ['small', 'medium', 'large'];

  get isActive(): boolean {
    return this.quantity >= 1;
  }

  toggleSelected(): void {
    if (this.isActive) {
      this.quantityChange.emit(0);
      return;
    }

    this.quantityChange.emit(1);
  }

  setQuantity(value: number): void {
    this.quantityChange.emit(value);
  }

  setSize(value: ActuatorSize): void {
    this.sizeChange.emit(value);
  }

  labelForSize(size: ActuatorSize): string {
    switch (size) {
      case 'small':
        return 'S';
      case 'medium':
        return 'M';
      case 'large':
        return 'L';
    }
  }
}