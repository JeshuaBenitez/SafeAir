import { ActuatorSize } from './actuator-size.model';
import { ActuatorType } from './actuator-type.model';

export interface RoomActuatorConfig {
  readonly type: ActuatorType;
  readonly quantity: number;
  readonly size: ActuatorSize;
}

export type RoomActuatorsMap = Readonly<Record<ActuatorType, RoomActuatorConfig>>;
