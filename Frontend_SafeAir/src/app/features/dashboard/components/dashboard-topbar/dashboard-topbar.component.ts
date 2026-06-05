import { NgFor, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs';

import { DashboardFacade } from '@features/dashboard/application/facades/dashboard.facade';
import { DashboardRoom } from '@features/dashboard/domain/models/dashboard-room.model';

type PickerMode = 'calendar' | 'year' | 'hour' | 'minute';

interface CalendarDay {
  day: number;
  isoDate: string;
  isCurrentMonth: boolean;
}

interface ClockMark {
  value: number;
  label: string;
  angle: number;
}

@Component({
  selector: 'sa-dashboard-topbar',
  standalone: true,
  imports: [NgIf, NgFor],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardTopbarComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly router = inject(Router);
  private readonly dashboardFacade = inject(DashboardFacade);

  searchMessage = '';

  @Input() locationLabel = 'Dashboard';
  @Input() breadcrumbRoot = 'Inicio';
  @Input() breadcrumbCurrent = 'Configuración de cuartos ';
  @Input() selectedDate = '';
  @Input() selectedTime = '';
  @Input() showDateTimeFilter = false;
  @Input() showReportButton = false;

  @Output() dateTimeApplied = new EventEmitter<{ date: string; time: string }>();
  @Output() generateReport = new EventEmitter<void>();

  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  readonly todayIsoDate = this.formatDateForInput(new Date());

  readonly hourMarks: ClockMark[] = Array.from({ length: 12 }, (_, index) => {
    const value = index * 2;

    return {
      value,
      label: this.pad(value),
      angle: value * 15,
    };
  });

  readonly minuteMarks: ClockMark[] = Array.from({ length: 12 }, (_, index) => {
    const value = index * 5;

    return {
      value,
      label: this.pad(value),
      angle: value * 6,
    };
  });

  isPickerOpen = false;
  pickerMode: PickerMode = 'calendar';

  draftDate = '';
  draftTime = '';

  draftHour = 0;
  draftMinute = 0;
  draftSecond = 0;

  calendarYear = new Date().getFullYear();
  calendarMonth = new Date().getMonth();
  calendarDays: CalendarDay[] = [];

  yearRangeStart = new Date().getFullYear() - 6;

  private isClockDragging = false;
  private clockFaceElement: HTMLElement | null = null;

  get calendarMonthLabel(): string {
    const date = new Date(this.calendarYear, this.calendarMonth, 1);

    return new Intl.DateTimeFormat('es-MX', {
      month: 'long',
    }).format(date);
  }

  get calendarYearLabel(): string {
    return String(this.calendarYear);
  }

  get draftYear(): string {
    const date = this.parseDateFromInput(this.draftDate || this.todayIsoDate);

    return String(date.getFullYear());
  }

  get draftMonthShort(): string {
  const date = this.parseDateFromInput(this.draftDate || this.todayIsoDate);

  const month = new Intl.DateTimeFormat('es-MX', {
    month: 'short',
  }).format(date).replace('.', '');

  return month.charAt(0).toUpperCase() + month.slice(1);
}

  get draftDayNumber(): string {
    const date = this.parseDateFromInput(this.draftDate || this.todayIsoDate);

    return String(date.getDate());
  }

  get draftHourLabel(): string {
    return this.pad(this.draftHour);
  }

  get draftMinuteLabel(): string {
    return this.pad(this.draftMinute);
  }

  get draftSecondLabel(): string {
    return this.pad(this.draftSecond);
  }

  get formattedDraftTime(): string {
    return `${this.draftHourLabel}:${this.draftMinuteLabel}:${this.draftSecondLabel}`;
  }

  get visibleYears(): number[] {
    return Array.from({ length: 12 }, (_, index) => this.yearRangeStart + index);
  }

  get currentClockMarks(): ClockMark[] {
    return this.pickerMode === 'hour' ? this.hourMarks : this.minuteMarks;
  }

  get activeClockValue(): number {
    return this.pickerMode === 'hour' ? this.draftHour : this.draftMinute;
  }

  get activeClockLabel(): string {
    return this.pickerMode === 'hour' ? this.draftHourLabel : this.draftMinuteLabel;
  }

  get selectedClockAngle(): number {
    if (this.pickerMode === 'hour') {
      return this.draftHour * 15;
    }

    return this.draftMinute * 6;
  }

  togglePicker(): void {
    if (this.showReportButton) {
      this.generateReport.emit();
      return;
    }

    if (!this.isPickerOpen) {
      this.prepareDraftValues();
      this.pickerMode = 'calendar';
    }

    this.isPickerOpen = !this.isPickerOpen;
  }

  closePicker(): void {
    this.isPickerOpen = false;
    this.stopClockDrag();
  }

  cancelSelection(): void {
    this.prepareDraftValues();
    this.closePicker();
  }

  applySelection(): void {
    const safeDate = this.draftDate || this.selectedDate || this.todayIsoDate;
    const safeTime = this.formattedDraftTime;

    this.selectedDate = safeDate;
    this.selectedTime = safeTime;

    this.dateTimeApplied.emit({
      date: safeDate,
      time: safeTime,
    });

    this.closePicker();
  }

  setPickerMode(mode: PickerMode): void {
    this.pickerMode = mode;
    this.stopClockDrag();

    if (mode === 'year') {
      this.yearRangeStart = this.calendarYear - 6;
    }
  }

  previousMonth(): void {
    if (this.calendarMonth === 0) {
      this.calendarMonth = 11;
      this.calendarYear -= 1;
    } else {
      this.calendarMonth -= 1;
    }

    this.buildCalendarDays();
  }

  nextMonth(): void {
    if (this.calendarMonth === 11) {
      this.calendarMonth = 0;
      this.calendarYear += 1;
    } else {
      this.calendarMonth += 1;
    }

    this.buildCalendarDays();
  }

  previousYearRange(): void {
    this.yearRangeStart -= 12;
  }

  nextYearRange(): void {
    this.yearRangeStart += 12;
  }

  selectCalendarYear(year: number): void {
    this.calendarYear = year;
    this.yearRangeStart = year - 6;
    this.pickerMode = 'calendar';
    this.buildCalendarDays();
  }

  selectCalendarDate(isoDate: string): void {
    this.draftDate = isoDate;

    const selected = this.parseDateFromInput(isoDate);

    this.calendarYear = selected.getFullYear();
    this.calendarMonth = selected.getMonth();

    this.buildCalendarDays();
  }

  selectClockValue(value: number): void {
    if (this.pickerMode === 'hour') {
      this.draftHour = this.clampTimeValue(value, 0, 23);
    }

    if (this.pickerMode === 'minute') {
      this.draftMinute = this.clampTimeValue(value, 0, 59);
    }

    this.draftTime = this.formattedDraftTime;
  }

  startClockDrag(event: PointerEvent): void {
    if (this.pickerMode !== 'hour' && this.pickerMode !== 'minute') {
      return;
    }

    const face = event.currentTarget as HTMLElement;

    this.clockFaceElement = face;
    this.isClockDragging = true;

    face.setPointerCapture?.(event.pointerId);

    this.updateClockFromPointer(event);
    event.preventDefault();
  }

  moveClockDrag(event: PointerEvent): void {
    if (!this.isClockDragging) {
      return;
    }

    this.updateClockFromPointer(event);
    event.preventDefault();
  }

  formatDisplayDate(value: string): string {
    if (!value) return 'Seleccionar fecha';

    const [year, month, day] = value.split('-');
    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
  }

  trackByCalendarDay(_index: number, day: CalendarDay): string {
    return day.isoDate;
  }

  trackByYear(_index: number, year: number): number {
    return year;
  }

  trackByClockMark(_index: number, mark: ClockMark): number {
    return mark.value;
  }


  onSearchInput(value: string): void {
  if (value.trim().length > 0) {
    this.searchMessage = '';
  }
}

searchRoom(rawQuery: string): void {
  const query = rawQuery.trim();

  if (!query) {
    this.searchMessage = 'Escribe el nombre de un cuarto para buscar.';
    return;
  }

  this.dashboardFacade.viewModel$
    .pipe(take(1))
    .subscribe((vm) => {
      const match = this.findBestRoomMatch(query, vm.rooms);

      if (!match) {
        this.searchMessage = `No se encontraron resultados para "${query}".`;
        return;
      }

      this.searchMessage = '';
      this.router.navigate(['/rooms', match.id, 'control']);
    });
}

private findBestRoomMatch(query: string, rooms: readonly DashboardRoom[]): DashboardRoom | null {
  const normalizedQuery = this.normalizeSearchText(query);

  if (!normalizedQuery) {
    return null;
  }

  const scoredRooms = rooms
    .map((room) => {
      const roomName = this.normalizeSearchText(room.name);
      const designation = this.normalizeSearchText(room.designation);
      const searchableName = `${roomName} ${designation}`.trim();

      return {
        room,
        score: this.getSearchScore(normalizedQuery, searchableName),
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scoredRooms[0]?.room ?? null;
}

private getSearchScore(query: string, target: string): number {
  if (!query || !target) {
    return 0;
  }

  if (target === query) {
    return 100;
  }

  if (target.startsWith(query)) {
    return 90;
  }

  if (target.includes(query)) {
    return 80;
  }

  const words = target.split(/\s+/);

  if (words.some((word) => word.startsWith(query))) {
    return 75;
  }

  const bestDistance = Math.min(
    ...words.map((word) => this.getLevenshteinDistance(query, word)),
  );

  const maxLength = Math.max(query.length, Math.max(...words.map((word) => word.length)));
  const similarity = 1 - bestDistance / Math.max(1, maxLength);

  if (similarity >= 0.58) {
    return Math.round(similarity * 70);
  }

  return 0;
}

private normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

private getLevenshteinDistance(source: string, target: string): number {
  const rows = source.length + 1;
  const columns = target.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[source.length][target.length];
}
  @HostListener('document:pointermove', ['$event'])
  handleDocumentPointerMove(event: PointerEvent): void {
    if (!this.isClockDragging) {
      return;
    }

    this.updateClockFromPointer(event);
  }

  @HostListener('document:pointerup')
  handleDocumentPointerUp(): void {
    this.stopClockDrag();
  }

  @HostListener('document:click', ['$event'])
  handleOutsideClick(event: MouseEvent): void {
    const clickedInside = this.host.nativeElement.contains(event.target as Node);

    if (!clickedInside) {
      this.closePicker();
    }
  }

  private updateClockFromPointer(event: PointerEvent): void {
    if (!this.clockFaceElement) {
      return;
    }

    const rect = this.clockFaceElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = event.clientX - centerX;
    const y = event.clientY - centerY;

    const radians = Math.atan2(y, x);
    const degrees = (radians * 180) / Math.PI;
    const clockDegrees = (degrees + 90 + 360) % 360;

    if (this.pickerMode === 'hour') {
      this.draftHour = Math.round(clockDegrees / 15) % 24;
    }

    if (this.pickerMode === 'minute') {
      this.draftMinute = Math.round(clockDegrees / 6) % 60;
    }

    this.draftTime = this.formattedDraftTime;
  }

  private stopClockDrag(): void {
    this.isClockDragging = false;
    this.clockFaceElement = null;
  }

  private prepareDraftValues(): void {
    const now = new Date();

    const safeDate = this.selectedDate || this.formatDateForInput(now);
    const safeTime = this.normalizeTime(this.selectedTime || this.formatTimeForInput(now));

    this.draftDate = safeDate;
    this.draftTime = safeTime;

    const selectedDate = this.parseDateFromInput(safeDate);

    this.calendarYear = selectedDate.getFullYear();
    this.calendarMonth = selectedDate.getMonth();
    this.yearRangeStart = this.calendarYear - 6;

    const [hour, minute, second] = safeTime.split(':').map((part) => Number(part));

    this.draftHour = Number.isFinite(hour) ? this.clampTimeValue(hour, 0, 23) : 0;
    this.draftMinute = Number.isFinite(minute) ? this.clampTimeValue(minute, 0, 59) : 0;
    this.draftSecond = Number.isFinite(second) ? this.clampTimeValue(second, 0, 59) : 0;

    this.buildCalendarDays();
  }

  private buildCalendarDays(): void {
    const days: CalendarDay[] = [];
    const firstDayOfMonth = new Date(this.calendarYear, this.calendarMonth, 1);
    const lastDayOfMonth = new Date(this.calendarYear, this.calendarMonth + 1, 0);

    const mondayBasedStart = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = lastDayOfMonth.getDate();
    const previousMonthLastDay = new Date(this.calendarYear, this.calendarMonth, 0).getDate();

    for (let i = mondayBasedStart - 1; i >= 0; i -= 1) {
      const day = previousMonthLastDay - i;
      const date = new Date(this.calendarYear, this.calendarMonth - 1, day);

      days.push({
        day,
        isoDate: this.formatDateForInput(date),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(this.calendarYear, this.calendarMonth, day);

      days.push({
        day,
        isoDate: this.formatDateForInput(date),
        isCurrentMonth: true,
      });
    }

    let nextMonthDay = 1;

    while (days.length % 7 !== 0 || days.length < 42) {
      const date = new Date(this.calendarYear, this.calendarMonth + 1, nextMonthDay);

      days.push({
        day: nextMonthDay,
        isoDate: this.formatDateForInput(date),
        isCurrentMonth: false,
      });

      nextMonthDay += 1;
    }

    this.calendarDays = days;
  }

  private clampTimeValue(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private normalizeTime(value: string): string {
    const [rawHour = '00', rawMinute = '00', rawSecond = '00'] = value.split(':');

    const hour = this.clampTimeValue(Number(rawHour), 0, 23);
    const minute = this.clampTimeValue(Number(rawMinute), 0, 59);
    const second = this.clampTimeValue(Number(rawSecond), 0, 59);

    return `${this.pad(hour)}:${this.pad(minute)}:${this.pad(second)}`;
  }

  private parseDateFromInput(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));

    if (!year || !month || !day) {
      return new Date();
    }

    return new Date(year, month - 1, day);
  }

  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());

    return `${year}-${month}-${day}`;
  }

  private formatTimeForInput(date: Date): string {
    const hours = this.pad(date.getHours());
    const minutes = this.pad(date.getMinutes());
    const seconds = this.pad(date.getSeconds());

    return `${hours}:${minutes}:${seconds}`;
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}

