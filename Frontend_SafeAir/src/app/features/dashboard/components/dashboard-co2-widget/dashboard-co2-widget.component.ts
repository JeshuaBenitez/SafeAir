import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input } from '@angular/core';

interface ChartTick {
  readonly value: number;
  readonly y: number;
}

interface ChartXTick {
  readonly label: string;
  readonly x: number;
}

interface ChartPoint {
  readonly index: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly timeLabel: string;
}

@Component({
  selector: 'sa-dashboard-co2-widget',
  standalone: true,
  imports: [DecimalPipe, NgFor, NgIf],
  templateUrl: './dashboard-co2-widget.component.html',
  styleUrl: './dashboard-co2-widget.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCo2WidgetComponent {
  @Input({ required: true }) co2Ppm = 500;
  @Input({ required: true }) history: readonly number[] = [];

  readonly chartWidth = 520;
  readonly chartHeight = 240;

  readonly minY = 0;
  readonly maxY = 2000;

  readonly marginTop = 16;
  readonly marginRight = 18;
  readonly marginBottom = 34;
  readonly marginLeft = 56;

  selectedIndex: number | null = null;
  isTooltipVisible = false;

  private isDraggingIndicator = false;
  private activeSvgElement: SVGSVGElement | null = null;

  readonly yTicks: readonly ChartTick[] = Array.from({ length: 6 }, (_, index) => {
    const value = index * 400;

    return {
      value,
      y: this.toChartY(value),
    };
  });

  readonly xTicks: readonly ChartXTick[] = [
    { label: 'Hace 1 min', x: this.marginLeft },
    { label: '40 s', x: this.marginLeft + this.plotWidth * 0.33 },
    { label: '20 s', x: this.marginLeft + this.plotWidth * 0.66 },
    { label: 'Ahora', x: this.marginLeft + this.plotWidth },
  ];

  get linePath(): string {
    return this.buildLinePath(this.safeHistory);
  }

  get areaPath(): string {
    const history = this.safeHistory;

    if (history.length === 0) {
      return '';
    }

    const baseY = this.marginTop + this.plotHeight;

    return `${this.linePath} L ${this.marginLeft + this.plotWidth} ${baseY} L ${this.marginLeft} ${baseY} Z`;
  }

  get trendLabel(): string {
    if (this.history.length < 2) {
      return 'Estable';
    }

    const previous = this.history[this.history.length - 2];

    if (this.co2Ppm > previous + 25) {
      return 'Subiendo';
    }

    if (this.co2Ppm < previous - 25) {
      return 'Bajando';
    }

    return 'Estable';
  }

  get plotWidth(): number {
    return this.chartWidth - this.marginLeft - this.marginRight;
  }

  get plotHeight(): number {
    return this.chartHeight - this.marginTop - this.marginBottom;
  }

  get chartPoints(): readonly ChartPoint[] {
    return this.safeHistory.map((value, index, values) => {
      const x = this.marginLeft + (index / Math.max(1, values.length - 1)) * this.plotWidth;
      const y = this.toChartY(value);

      return {
        index,
        value,
        x,
        y,
        timeLabel: this.getTimeLabel(index, values.length),
      };
    });
  }

  get activePoint(): ChartPoint {
    const points = this.chartPoints;
    const fallbackIndex = Math.max(0, points.length - 1);

    const index =
      this.selectedIndex === null
        ? fallbackIndex
        : this.clampIndex(this.selectedIndex, points.length);

    return points[index] ?? {
      index: 0,
      value: this.co2Ppm,
      x: this.marginLeft + this.plotWidth,
      y: this.toChartY(this.co2Ppm),
      timeLabel: 'Ahora',
    };
  }

  get tooltipTransform(): string {
    const point = this.activePoint;
    const tooltipWidth = 136;
    const tooltipHeight = 50;

    const x = Math.min(
      this.chartWidth - this.marginRight - tooltipWidth,
      Math.max(this.marginLeft, point.x - tooltipWidth / 2),
    );

    const y = Math.max(this.marginTop + 4, point.y - tooltipHeight - 14);

    return `translate(${x.toFixed(2)} ${y.toFixed(2)})`;
  }

  showTooltip(): void {
    this.isTooltipVisible = true;
  }

  hideTooltip(): void {
    if (!this.isDraggingIndicator) {
      this.isTooltipVisible = false;
    }
  }

  startIndicatorDrag(event: PointerEvent): void {
    const indicator = event.currentTarget as SVGElement;
    const svg = indicator.ownerSVGElement;

    if (!svg) {
      return;
    }

    this.activeSvgElement = svg;
    this.isDraggingIndicator = true;
    this.isTooltipVisible = true;

    indicator.setPointerCapture?.(event.pointerId);

    this.updateSelectedPointFromPointer(event);

    event.preventDefault();
    event.stopPropagation();
  }

  @HostListener('document:pointermove', ['$event'])
  handleDocumentPointerMove(event: PointerEvent): void {
    if (!this.isDraggingIndicator) {
      return;
    }

    this.updateSelectedPointFromPointer(event);
  }

  @HostListener('document:pointerup')
  handleDocumentPointerUp(): void {
    if (!this.isDraggingIndicator) {
      return;
    }

    this.isDraggingIndicator = false;
    this.activeSvgElement = null;
    this.isTooltipVisible = false;
  }

  trackByPoint(_index: number, point: ChartPoint): number {
    return point.index;
  }

  private updateSelectedPointFromPointer(event: PointerEvent): void {
    if (!this.activeSvgElement) {
      return;
    }

    const rect = this.activeSvgElement.getBoundingClientRect();

    const relativeX = ((event.clientX - rect.left) / rect.width) * this.chartWidth;
    const ratio = (relativeX - this.marginLeft) / this.plotWidth;
    const nearestIndex = Math.round(ratio * Math.max(0, this.safeHistory.length - 1));

    this.selectedIndex = this.clampIndex(nearestIndex, this.safeHistory.length);
  }

  private get safeHistory(): readonly number[] {
    if (this.history.length > 0) {
      return this.history;
    }

    return [this.co2Ppm];
  }

  private buildLinePath(history: readonly number[]): string {
    if (history.length === 0) {
      return '';
    }

    return history
      .map((value, index) => {
        const x = this.marginLeft + (index / Math.max(1, history.length - 1)) * this.plotWidth;
        const y = this.toChartY(value);

        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private toChartY(value: number): number {
    const clamped = Math.max(this.minY, Math.min(this.maxY, value));
    const ratio = (clamped - this.minY) / (this.maxY - this.minY);

    return this.marginTop + this.plotHeight - ratio * this.plotHeight;
  }

  private getTimeLabel(index: number, length: number): string {
    if (length <= 1 || index === length - 1) {
      return 'Ahora';
    }

    const secondsAgo = Math.round(((length - 1 - index) / Math.max(1, length - 1)) * 60);

    return `Hace ${secondsAgo} s`;
  }

  private clampIndex(index: number, length: number): number {
    if (length <= 0) {
      return 0;
    }

    return Math.min(length - 1, Math.max(0, index));
  }
}