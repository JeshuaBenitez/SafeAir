export interface ActuatorStateInput {
  emulatorId: string;
  roomId?: string;
  deviceType: "minisplit" | "purifier" | "extractor";
  isOn: boolean;
  mode?: string;
  targetTemperature?: number;
  ambientTemperature?: number;
  ambientHumidity?: number;
  timestamp?: string;
}
