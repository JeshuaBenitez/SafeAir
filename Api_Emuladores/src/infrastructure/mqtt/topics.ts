export function telemetryTopic(emulatorId: string): string {
  return `safeair/${emulatorId}/telemetry`;
}

export function roomActionsTopic(roomId: string): string {
  return `safeair/${roomId}/actions`;
}

export function roomAlarmsTopic(roomId: string): string {
  return `safeair/${roomId}/alarms`;
}

export function emulatorConfigTopic(emulatorId: string): string {
  return `safeair/${emulatorId}/config`;
}

export function actuatorStateTopic(emulatorId: string): string {
  return `safeair/${emulatorId}/actuator-state`;
}
