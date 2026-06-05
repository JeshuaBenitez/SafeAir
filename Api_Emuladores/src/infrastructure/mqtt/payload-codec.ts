import protobuf from "protobufjs";

type MqttPayloadKind = "telemetry" | "actuator-state";

const root = protobuf.Root.fromJSON({
  nested: {
    safeair: {
      nested: {
        TelemetryPayload: {
          fields: {
            emulatorId: { type: "string", id: 1 },
            roomId: { type: "string", id: 2 },
            temperature: { type: "float", id: 3 },
            humidity: { type: "float", id: 4 },
            co2: { type: "float", id: 5 },
            pm25: { type: "float", id: 6 },
            timestamp: { type: "string", id: 7 }
          }
        },
        ActuatorStatePayload: {
          fields: {
            emulatorId: { type: "string", id: 1 },
            roomId: { type: "string", id: 2 },
            deviceType: { type: "string", id: 3 },
            isOn: { type: "bool", id: 4 },
            mode: { type: "string", id: 5 },
            targetTemperature: { type: "float", id: 6 },
            ambientTemperature: { type: "float", id: 7 },
            ambientHumidity: { type: "float", id: 8 },
            timestamp: { type: "string", id: 9 }
          }
        }
      }
    },
    mqtt: {
      nested: {
        SensorValue: {
          fields: {
            name: { type: "string", id: 1 },
            value: { type: "double", id: 2 }
          }
        },
        DeviceAttribute: {
          fields: {
            key: { type: "string", id: 1 },
            value: { type: "int32", id: 2 }
          }
        },
        DeviceStateMessage: {
          fields: {
            deviceType: { type: "string", id: 1 },
            on: { type: "bool", id: 2 },
            attributes: { rule: "repeated", type: "DeviceAttribute", id: 3 }
          }
        },
        RoomStateMessage: {
          fields: {
            temperatureC: { type: "double", id: 1 },
            humidityPct: { type: "double", id: 2 },
            co2Ppm: { type: "double", id: 3 },
            pm25UgM3: { type: "double", id: 4 }
          }
        },
        TelemetryMessage: {
          fields: {
            messageId: { type: "string", id: 1 },
            emulatorId: { type: "string", id: 2 },
            eventTimestampEpochMs: { type: "int64", id: 3 },
            tickDurationMs: { type: "int64", id: 4 },
            queueSize: { type: "int32", id: 5 },
            activeEmulatorCount: { type: "int32", id: 6 },
            droppedTelemetryCount: { type: "int64", id: 7 },
            sensors: { rule: "repeated", type: "SensorValue", id: 8 },
            devices: { rule: "repeated", type: "DeviceStateMessage", id: 9 },
            roomState: { type: "RoomStateMessage", id: 10 }
          }
        }
      }
    }
  }
});

const telemetryType = root.lookupType("safeair.TelemetryPayload");
const actuatorStateType = root.lookupType("safeair.ActuatorStatePayload");
const emulatorTelemetryType = root.lookupType("mqtt.TelemetryMessage");

function tryDecodeType(type: protobuf.Type, buffer: Buffer): Record<string, unknown> | null {
  try {
    const message = type.decode(buffer);
    return type.toObject(message, {
      defaults: false,
      enums: String,
      longs: String,
      bytes: String
    }) as Record<string, unknown>;
  } catch {
    // Fallback when producer sends length-delimited protobuf frames.
    try {
      const message = type.decodeDelimited(buffer);
      return type.toObject(message, {
        defaults: false,
        enums: String,
        longs: String,
        bytes: String
      }) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function resolveKind(topic: string): MqttPayloadKind | null {
  if (topic.endsWith("/telemetry")) {
    return "telemetry";
  }

  if (topic.endsWith("/actuator-state")) {
    return "actuator-state";
  }

  return null;
}

function decodeProtobuf(kind: MqttPayloadKind, buffer: Buffer): Record<string, unknown> {
  const type = kind === "telemetry" ? telemetryType : actuatorStateType;
  const decoded = tryDecodeType(type, buffer);
  if (!decoded) {
    throw new Error(`Unable to decode protobuf payload for ${kind}`);
  }

  return decoded;
}

function toNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function normalizeEmulatorTelemetry(buffer: Buffer): Record<string, unknown> {
  const raw = tryDecodeType(emulatorTelemetryType, buffer);
  if (!raw) {
    throw new Error("Unable to decode emulator telemetry protobuf payload");
  }

  const roomState = (raw.roomState ?? {}) as Record<string, unknown>;
  const sensors = Array.isArray(raw.sensors) ? (raw.sensors as Array<Record<string, unknown>>) : [];
  const devices = Array.isArray(raw.devices) ? (raw.devices as Array<Record<string, unknown>>) : [];

  const sensorByName = (names: string[]): number | undefined => {
    for (const sensor of sensors) {
      const name = String(sensor.name ?? "").toLowerCase();
      if (names.some((n) => n.toLowerCase() === name)) {
        const value = toNumber(sensor.value);
        if (value !== undefined) {
          return value;
        }
      }
    }

    return undefined;
  };

  const temperature = toNumber(roomState.temperatureC) ?? sensorByName(["temperature", "temperaturec", "temp"]);
  const humidity = toNumber(roomState.humidityPct) ?? sensorByName(["humidity", "humiditypct"]);
  const co2 = toNumber(roomState.co2Ppm) ?? sensorByName(["co2", "co2ppm"]);
  const pm25 = toNumber(roomState.pm25UgM3) ?? sensorByName(["pm25", "pm25ugm3"]);

  const epochMs = toNumber(raw.eventTimestampEpochMs);
  const timestamp = epochMs ? new Date(epochMs).toISOString() : undefined;

  const deviceStates = devices.map((device) => {
    const attrs = Array.isArray(device.attributes) ? (device.attributes as Array<Record<string, unknown>>) : [];
    const attrMap = new Map<string, number>();

    for (const attr of attrs) {
      const key = String(attr.key ?? "");
      const val = toNumber(attr.value);
      if (key && val !== undefined) {
        attrMap.set(key, val);
      }
    }

    return {
      emulatorId: String(raw.emulatorId ?? ""),
      deviceType: String(device.deviceType ?? "").toLowerCase(),
      isOn: Boolean(device.on),
      targetTemperature: attrMap.get("targetTemperature") ?? attrMap.get("setpoint") ?? attrMap.get("temperature"),
      ambientTemperature: temperature,
      ambientHumidity: humidity,
      timestamp
    };
  });

  return {
    emulatorId: String(raw.emulatorId ?? ""),
    temperature,
    humidity,
    co2,
    pm25,
    timestamp,
    deviceStates
  };
}

function hasCanonicalTelemetryFields(payload: Record<string, unknown>): boolean {
  return [payload.temperature, payload.humidity, payload.co2, payload.pm25].every((v) => Number.isFinite(Number(v)));
}

export function decodeMqttPayload(topic: string, buffer: Buffer): Record<string, unknown> {
  const kind = resolveKind(topic);
  if (!kind) {
    throw new Error(`Unsupported MQTT topic for payload decode: ${topic}`);
  }

  const utf8 = buffer.toString("utf8").trim();
  const looksLikeJson = utf8.startsWith("{") || utf8.startsWith("[");

  if (looksLikeJson) {
    return JSON.parse(utf8) as Record<string, unknown>;
  }

  if (kind === "telemetry") {
    const canonical = tryDecodeType(telemetryType, buffer);
    if (canonical && hasCanonicalTelemetryFields(canonical)) {
      return canonical;
    }

    const normalized = normalizeEmulatorTelemetry(buffer);
    if (hasCanonicalTelemetryFields(normalized)) {
      return normalized;
    }

    throw new Error("Telemetry protobuf decoded but required metric fields are missing");
  }

  return decodeProtobuf(kind, buffer);
}
