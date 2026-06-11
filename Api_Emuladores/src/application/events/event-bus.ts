import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

export const EVENTS = {
  ACTION_CREATED: "action.created",
  ALARM_CREATED: "alarm.created",
  TELEMETRY_RECEIVED: "telemetry.received",
  TELEMETRY_PERSISTED: "telemetry.persisted",
  EMULATOR_UPDATED: "emulator.updated",
  ACTUATOR_COMMAND_SENT: "actuator.command.sent",
  ACTUATOR_STATE_RECEIVED: "actuator.state.received",
  ACTUATOR_STATE_PERSISTED: "actuator.state.persisted",
  DEBUG_LOG_CREATED: "debug.log.created",
  MQTT_CONNECTED: "mqtt.connected",
  MQTT_DISCONNECTED: "mqtt.disconnected",
  MQTT_RECONNECTED: "mqtt.reconnected",
  MQTT_ERROR: "mqtt.error"
} as const;
