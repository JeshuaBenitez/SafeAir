export interface ActuatorStateInput {
  emulatorId: string;
  roomId?: string;
  roomName?: string;
  deviceType: "minisplit" | "purifier" | "extractor";
  deviceIndex?: number;
  isOn: boolean;
  mode?: string;
  targetTemperature?: number;
  ambientTemperature?: number;
  ambientHumidity?: number;
  timestamp?: string;
}
