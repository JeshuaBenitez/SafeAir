import { ActuatorSize } from './actuator-size.model';

export interface CreateRoomDraft {
  readonly name: string;
  readonly areaM2: number;
  readonly windowsCount: number;
  readonly actuatorQuantities: {
    readonly minisplit: number;
    readonly purifier: number;
    readonly extractor: number;
  };
  readonly actuatorSizes: {
    readonly minisplit: ActuatorSize;
    readonly purifier: ActuatorSize;
    readonly extractor: ActuatorSize;
  };
}