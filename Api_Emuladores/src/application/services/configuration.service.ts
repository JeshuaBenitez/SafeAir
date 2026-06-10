import { AppError } from "../../shared/errors/app-error";
import { ConfigurationRepository } from "../../infrastructure/repositories/configuration.repository";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { emulatorConfigTopic } from "../../infrastructure/mqtt/topics";
import { addLog, logMqttPublished, logError, logSystem } from "./debug-logs.service";

export class ConfigurationService {
  constructor(
    private readonly configurationRepository: ConfigurationRepository,
    private readonly emulatorRepository: EmulatorRepository,
    private readonly roomRepository: RoomRepository
  ) {}

  async getRoomConfig(roomId: string): Promise<unknown> {
    return this.configurationRepository.getRoomConfig(roomId);
  }

  /**
   * Find or assign an emulator to a room, then publish the room configuration.
   * This is the main entry point called after upsertSetup() saves the room.
   *
   * Flow:
   * 1. Check if room already has an emulator assigned
   * 2. If not, find an available emulator and assign it
   * 3. Build the compatible payload for the Java emulator
   * 4. Publish to MQTT safeair/{emulatorExternalId}/config
   */
  async publishRoomConfig(roomId: string): Promise<void> {
    // ── Step 1: Load full room with setup ──────────────────────────────────
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    const setup = room.get("setup") as {
      roomWidth: number;
      roomLength: number;
      minisplitCount: number;
      purifierCount: number;
      extractorCount: number;
    } | null;

    if (!setup) {
      throw new AppError("Room setup not found. Save setup before publishing config.", 400, "SETUP_NOT_FOUND");
    }

    logSystem("Room config build started", {
      roomId,
      roomName: room.name,
      setupExists: true
    });

    // ── Step 2: Find or assign emulator ────────────────────────────────────
    let emulator = await this.emulatorRepository.findByRoomId(roomId);
    if (!emulator) {
      logSystem("No emulator assigned to room, looking for available emulator", { roomId });

      emulator = await this.emulatorRepository.assignFirstAvailableToRoom(roomId);
      if (!emulator) {
        logError("system", "no-emulator-available", new Error(`No emulator available for room ${roomId}`));
        throw new AppError(
          "No emulator available. Ensure the managed emulator pool has free online emulators.",
          503,
          "NO_EMULATOR_AVAILABLE"
        );
      }

      logSystem("Emulator assigned to room", {
        roomId,
        emulatorExternalId: emulator.emulatorExternalId
      });
    } else {
      logSystem("Using existing emulator for room", {
        roomId,
        emulatorExternalId: emulator.emulatorExternalId
      });
    }

    // ── Step 3: Build payload compatible with Java ConfigAdapter ────────────
    // The Java emulator expects ConfigCommand with string key-value pairs.
    // Arrays are serialized as comma-separated strings.
    //
    // Mapping to Java DtoSetup fields:
    //   roomSquareMeters = roomWidth * roomLength
    //   updateIntervalSec = 5 (default, 5 seconds)
    //   sensorTypes: 1=Humidity, 2=Temperature, 3=PM2.5, 4=CO2
    //   deviceTypes: 1=MiniSplit, 2=HumidifierPurifier, 3=AirExtractor
    const roomSquareMeters = Math.round(setup.roomWidth * setup.roomLength * 10) / 10;

    const sensorTypes = [1, 2, 3, 4]; // All sensors active
    const deviceTypes: number[] = [];
    for (let i = 0; i < setup.minisplitCount; i++) deviceTypes.push(1);
    for (let i = 0; i < setup.purifierCount; i++) deviceTypes.push(2);
    for (let i = 0; i < setup.extractorCount; i++) deviceTypes.push(3);

    // Payload as string key-value pairs (ConfigAdapter compatible)
    const payload: Record<string, string> = {
      roomId,
      roomName: room.name,
      roomSquareMeters: String(roomSquareMeters),
      roomWidth: String(setup.roomWidth),
      roomLength: String(setup.roomLength),
      windowCount: String(0), // Not in DtoSetup; available in telemetry RoomStateSnapshot
      minisplitCount: String(setup.minisplitCount),
      purifierCount: String(setup.purifierCount),
      extractorCount: String(setup.extractorCount),
      updateIntervalSec: "5",
      sensorTypes: sensorTypes.join(","),
      deviceTypes: deviceTypes.join(","),
      sentAt: new Date().toISOString()
    };

    // ── Step 4: Publish to MQTT ─────────────────────────────────────────────
    const topic = emulatorConfigTopic(emulator.emulatorExternalId);

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room-config-publish",
      message: `Publishing room config to MQTT topic: ${topic}`,
      details: {
        roomId,
        roomName: room.name,
        emulatorExternalId: emulator.emulatorExternalId,
        topic,
        payload: {
          ...payload,
          // Log friendly summary
          summary: `${room.name}: ${roomSquareMeters}m², sensors=${sensorTypes.length}, devices=${deviceTypes.length} (mini=${setup.minisplitCount}, puri=${setup.purifierCount}, ex=${setup.extractorCount})`
        }
      },
      roomId,
      emulatorId: emulator.emulatorExternalId
    });

    try {
      await mqttGateway.publish(topic, payload);

      logMqttPublished(topic, payload, emulator.emulatorExternalId);

      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "api",
        event: "room-config-published",
        message: `Room config published successfully to ${emulator.emulatorExternalId}`,
        details: { roomId, roomName: room.name, emulatorExternalId: emulator.emulatorExternalId, topic },
        roomId,
        emulatorId: emulator.emulatorExternalId
      });
    } catch (err) {
      logError("system", "room-config-publish-failed", err);
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "system",
        event: "room-config-publish-failed",
        message: `Failed to publish room config: ${err instanceof Error ? err.message : String(err)}`,
        details: { roomId, emulatorExternalId: emulator.emulatorExternalId, topic },
        roomId,
        emulatorId: emulator.emulatorExternalId
      });
      throw new AppError(
        `Failed to publish room config: ${err instanceof Error ? err.message : String(err)}`,
        500,
        "MQTT_PUBLISH_FAILED"
      );
    }
  }
}
