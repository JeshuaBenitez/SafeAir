import { EventEmitter } from "events";

class EventBus extends EventEmitter {}

export const eventBus = new EventBus();

export const EVENTS = {
  ACTION_CREATED: "action.created",
  ALARM_CREATED: "alarm.created"
} as const;
