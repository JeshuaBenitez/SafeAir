export type ActuatorSize = "small" | "medium" | "large";

export interface RoomSetupInput {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  windowCount: number;
  windowAreaTotal: number;
  minisplitCount: number;
  purifierCount: number;
  extractorCount: number;
  minisplitSize: ActuatorSize;
  purifierSize: ActuatorSize;
  extractorSize: ActuatorSize;
}

export interface RoomSetupDerived {
  roomArea: number;
  windowAreaRatio: number;
  windowFactorBase: number;
  windowFactor: number;
  areaTermica: number;
  areaCalidadAire: number;
}
