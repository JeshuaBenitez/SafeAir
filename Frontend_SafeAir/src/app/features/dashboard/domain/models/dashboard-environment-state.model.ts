export interface DashboardEnvironmentState {
  readonly roomId: string;
  readonly temperatureC: number;
  readonly humidityPct: number;
  readonly co2Ppm: number;
  readonly pm25UgM3: number;
  readonly co2History: readonly number[];
  readonly pm25History: readonly number[];
  readonly updatedAt: number;
}

export interface DashboardRoomOption {
  readonly id: string;
  readonly label: string;
  readonly statusLabel: string;
}

export interface DashboardEnvironmentViewModel {
  readonly rooms: readonly DashboardRoomOption[];
  readonly selectedRoomId: string | null;
  readonly selectedRoomLabel: string | null;
  readonly selectedRoomHasEmulator: boolean;
  readonly selectedState: DashboardEnvironmentState | null;
}
