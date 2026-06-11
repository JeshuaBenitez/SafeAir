import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { logMqttPublished } from "../../application/services/debug-logs.service";
import type { EmulatorModel } from "../../infrastructure/database/models";
import { mqttGateway } from "../../infrastructure/mqtt/mqtt.gateway";
import { actuatorStateTopic, emulatorCommandTopic, emulatorConfigTopic, emulatorScenarioTopic } from "../../infrastructure/mqtt/topics";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { AppError } from "../../shared/errors/app-error";

const emulatorRepository = new EmulatorRepository();
const roomRepository = new RoomRepository();

function serializeEmulator(emulator: EmulatorModel) {
  const room = emulator.get("room") as { id?: string; name?: string; instance?: { userId?: string } } | null;
  return {
    id: emulator.id,
    emulatorExternalId: emulator.emulatorExternalId,
    status: emulator.status,
    roomId: emulator.roomId,
    roomName: room?.name ?? null,
    ownerUserId: room?.instance?.userId ?? null,
    assigned: Boolean(emulator.roomId),
    createdAt: emulator.createdAt,
    updatedAt: emulator.updatedAt
  };
}

function buildEnvelope(source: string, payload: Record<string, unknown>) {
  return {
    correlationId: randomUUID(),
    source,
    timestamp: new Date().toISOString(),
    ...payload
  };
}

export class EmulatorController {
  async list(req: Request, res: Response): Promise<void> {
    const emulators = req.auth?.role === "admin"
      ? await emulatorRepository.findAllWithRooms()
      : await emulatorRepository.findAssignedToUser(this.requireUserId(req));
    res.status(200).json({ count: emulators.length, emulators: emulators.map(serializeEmulator) });
  }

  async free(req: Request, res: Response): Promise<void> {
    this.requireAdmin(req);
    const emulators = await emulatorRepository.findFree();
    res.status(200).json({ count: emulators.length, emulators: emulators.map(serializeEmulator) });
  }

  async assigned(req: Request, res: Response): Promise<void> {
    const emulators = req.auth?.role === "admin"
      ? await emulatorRepository.findAssigned()
      : await emulatorRepository.findAssignedToUser(this.requireUserId(req));
    res.status(200).json({ count: emulators.length, emulators: emulators.map(serializeEmulator) });
  }

  async get(req: Request, res: Response): Promise<void> {
    const emulator = await this.findAccessibleEmulator(req);
    res.status(200).json(serializeEmulator(emulator));
  }

  async assign(req: Request, res: Response): Promise<void> {
    this.requireAdmin(req);
    const emulatorExternalId = String(req.params.emulatorExternalId);
    const roomId = this.requireRoomId(req);

    const room = await roomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    const occupied = await emulatorRepository.findByRoomId(roomId);
    if (occupied && occupied.emulatorExternalId !== emulatorExternalId) {
      throw new AppError("Room already has an assigned emulator", 409, "ROOM_ALREADY_ASSIGNED");
    }

    const emulator = await emulatorRepository.findByExternalId(emulatorExternalId);
    if (!emulator) {
      throw new AppError("Emulator not found", 404, "EMULATOR_NOT_FOUND");
    }
    if (emulator.roomId && emulator.roomId !== roomId) {
      throw new AppError("Emulator is already assigned to another room", 409, "EMULATOR_ALREADY_ASSIGNED");
    }

    const updated = await emulatorRepository.assignToRoom(emulatorExternalId, roomId);
    res.status(200).json(serializeEmulator(updated ?? emulator));
  }

  async release(req: Request, res: Response): Promise<void> {
    this.requireAdmin(req);
    const emulator = await this.findEmulatorOrFail(String(req.params.emulatorExternalId));
    if (emulator.roomId) {
      await emulatorRepository.releaseRoom(emulator.roomId);
    }
    res.status(204).send();
  }

  async scenario(req: Request, res: Response): Promise<void> {
    const emulator = await this.findAccessibleEmulator(req);
    const scenario = typeof req.body.scenario === "string" ? req.body.scenario : undefined;
    if (!scenario) {
      throw new AppError("scenario is required", 422, "SCENARIO_REQUIRED");
    }

    const payload = buildEnvelope(String(req.body.source ?? "api"), { scenario });
    await this.publish(emulatorScenarioTopic(emulator.emulatorExternalId), payload, emulator.emulatorExternalId);
    res.status(202).json({ accepted: true, topic: emulatorScenarioTopic(emulator.emulatorExternalId), payload });
  }

  async config(req: Request, res: Response): Promise<void> {
    const emulator = await this.findAccessibleEmulator(req);
    const payload = buildEnvelope(String(req.body.source ?? "api"), { config: req.body.config ?? req.body });
    await this.publish(emulatorConfigTopic(emulator.emulatorExternalId), payload, emulator.emulatorExternalId);
    res.status(202).json({ accepted: true, topic: emulatorConfigTopic(emulator.emulatorExternalId), payload });
  }

  async command(req: Request, res: Response): Promise<void> {
    const emulator = await this.findAccessibleEmulator(req);
    const action = typeof req.body.action === "string" ? req.body.action : undefined;
    if (!action) {
      throw new AppError("action is required", 422, "ACTION_REQUIRED");
    }

    const topic = req.body.device ? actuatorStateTopic(emulator.emulatorExternalId) : emulatorCommandTopic(emulator.emulatorExternalId);
    const payload = buildEnvelope(String(req.body.source ?? "api"), req.body);
    await this.publish(topic, payload, emulator.emulatorExternalId);
    res.status(202).json({ accepted: true, topic, payload });
  }

  private async publish(topic: string, payload: Record<string, unknown>, emulatorExternalId: string): Promise<void> {
    await mqttGateway.publish(topic, payload);
    logMqttPublished(topic, payload, emulatorExternalId);
  }

  private async findAccessibleEmulator(req: Request): Promise<EmulatorModel> {
    const emulator = await this.findEmulatorOrFail(String(req.params.emulatorExternalId));
    if (req.auth?.role === "admin") {
      return emulator;
    }

    const userEmulators = await emulatorRepository.findAssignedToUser(this.requireUserId(req));
    if (!userEmulators.some((candidate) => candidate.emulatorExternalId === emulator.emulatorExternalId)) {
      throw new AppError("Emulator not found", 404, "EMULATOR_NOT_FOUND");
    }

    return emulator;
  }

  private async findEmulatorOrFail(emulatorExternalId: string): Promise<EmulatorModel> {
    const emulator = await emulatorRepository.findByExternalId(emulatorExternalId);
    if (!emulator) {
      throw new AppError("Emulator not found", 404, "EMULATOR_NOT_FOUND");
    }
    return emulator;
  }

  private requireRoomId(req: Request): string {
    const roomId = req.body.roomId ?? req.query.roomId;
    if (typeof roomId !== "string" || !roomId) {
      throw new AppError("roomId is required", 422, "ROOM_ID_REQUIRED");
    }

    return roomId;
  }

  private requireAdmin(req: Request): void {
    if (req.auth?.role !== "admin") {
      throw new AppError("Admin permissions required", 403, "ADMIN_REQUIRED");
    }
  }

  private requireUserId(req: Request): string {
    if (!req.auth?.sub) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    return req.auth.sub;
  }
}
