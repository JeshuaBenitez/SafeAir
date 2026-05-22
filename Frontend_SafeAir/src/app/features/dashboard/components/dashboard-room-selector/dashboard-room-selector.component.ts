import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';

import { DashboardRoomOption } from '@features/dashboard/domain/models/dashboard-environment-state.model';

@Component({
  selector: 'sa-dashboard-room-selector',
  standalone: true,
  imports: [NgFor],
  templateUrl: './dashboard-room-selector.component.html',
  styleUrl: './dashboard-room-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardRoomSelectorComponent {
  @Input({ required: true }) rooms: readonly DashboardRoomOption[] = [];
  @Input() selectedRoomId: string | null = null;

  @Output() roomSelected = new EventEmitter<string>();

  onSelect(roomId: string): void {
    this.roomSelected.emit(roomId);
  }
}
