export interface RoomSetupInput {
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  windowCount: number;
  windowAreaTotal: number;
  minisplitCount: number;
  purifierCount: number;
  extractorCount: number;
}

export interface RoomSetupDerived {
  roomArea: number;
  windowAreaRatio: number;
  windowFactorBase: number;
  windowFactor: number;
  areaTermica: number;
  areaCalidadAire: number;
}
