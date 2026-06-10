import { ActuatorSize } from './actuator-size.model';

export interface DashboardRoomActuatorConfig {
  readonly quantity: number;
  readonly size: ActuatorSize;
}

export interface DashboardRoomActuators {
  readonly minisplit: DashboardRoomActuatorConfig;
  readonly purifier: DashboardRoomActuatorConfig;
  readonly extractor: DashboardRoomActuatorConfig;
}

export interface DashboardRoom {
  readonly id: string;
  readonly name: string;
  readonly designation: string;
  readonly hasEmulator?: boolean;
  readonly emulatorExternalId?: string | null;
  readonly latestMetrics?: {
    readonly temperature: number;
    readonly humidity: number;
    readonly co2: number;
    readonly pm25: number;
    readonly measuredAt?: string;
  } | null;
  readonly areaM2: number;
  readonly windowsCount: number;
  readonly imageSrc: string;
  readonly controlImageSrc: string;
  readonly actuators: DashboardRoomActuators;
}
