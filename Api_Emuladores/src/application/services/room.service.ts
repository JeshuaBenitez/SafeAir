import { AppError } from "../../shared/errors/app-error";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { RoomSetupDomainService } from "../../domain/services/room-setup-domain.service";
import { ConfigurationService } from "./configuration.service";
import { addLog } from "./debug-logs.service";
import type { RoomSetupInput } from "../../domain/types/room.types";

export class RoomService {
  constructor(
    private readonly instanceRepository: InstanceRepository,
    private readonly roomRepository: RoomRepository,
    private readonly roomSetupDomainService: RoomSetupDomainService,
    private readonly configurationService: ConfigurationService
  ) {}

  async create(input: { instanceId: string; name: string }, userId: string): Promise<{ id: string }> {
    const instance = await this.instanceRepository.findById(input.instanceId, userId);
    if (!instance) {
      throw new AppError("Instance not found", 404, "INSTANCE_NOT_FOUND");
    }

    const roomCount = await this.instanceRepository.countRooms(input.instanceId);
    if (roomCount >= 3) {
      throw new AppError("Maximum 3 rooms per instance", 422, "MAX_ROOMS_REACHED");
    }

    const room = await this.roomRepository.create(input);
    return { id: room.id };
  }

  async getById(roomId: string, userId?: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return room;
  }

  async update(roomId: string, input: { name?: string }, userId: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    if (input.name) {
      room.name = input.name;
      await room.save();
    }
  }

  async upsertSetup(roomId: string, setup: RoomSetupInput, userId?: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    this.roomSetupDomainService.validateSetup(setup);
    const derived = this.roomSetupDomainService.derive(setup);

    const totalArea = await this.instanceRepository.totalArea(room.instanceId);
    const currentArea = room.get("derivedSetup") ? (room.get("derivedSetup") as { roomArea: number }).roomArea : 0;
    const projectedTotal = totalArea - currentArea + derived.roomArea;

    if (projectedTotal > 900) {
      throw new AppError("Total area per instance cannot exceed 900 m2", 422, "INSTANCE_AREA_LIMIT");
    }

    await this.roomRepository.upsertSetup(roomId, setup, derived);

    // ── Publish room configuration to the assigned emulator ─────────────────
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room-setup-saved",
      message: `Room setup saved, publishing config to emulator for room ${roomId}: "${room.name}"`,
      details: {
        roomId,
        roomName: room.name,
        setup: {
          roomWidth: setup.roomWidth,
          roomLength: setup.roomLength,
          windowCount: setup.windowCount,
          minisplitCount: setup.minisplitCount,
          purifierCount: setup.purifierCount,
          extractorCount: setup.extractorCount,
          derivedRoomArea: derived.roomArea
        }
      },
      roomId
    });

    try {
      await this.configurationService.publishRoomConfig(roomId);
    } catch (error) {
      if (error instanceof AppError && error.code === "NO_EMULATOR_AVAILABLE") {
        addLog({
          timestamp: new Date().toISOString(),
          level: "warn",
          source: "api",
          event: "room-setup-saved-without-emulator",
          message: `Room setup saved but no emulator is available for room ${roomId}`,
          details: { roomId, roomName: room.name },
          roomId
        });
        return;
      }

      throw error;
    }
  }

  async getSetup(roomId: string, userId: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return {
      setup: room.get("setup"),
      derived: room.get("derivedSetup")
    };
  }

  async listDevices(roomId: string, userId: string): Promise<unknown[]> {
    await this.getById(roomId, userId);
    return this.roomRepository.listDevices(roomId);
  }

  async createDevice(input: { roomId: string; type: "minisplit" | "purifier" | "extractor"; label: string }, userId: string): Promise<{ id: string }> {
    await this.getById(input.roomId, userId);
    const devices = await this.roomRepository.listDevices(input.roomId);
    const sameTypeCount = devices.filter((device) => device.type === input.type).length;
    if (sameTypeCount >= 3) {
      throw new AppError(`Maximum 3 devices of type ${input.type} per room`, 422, "DEVICE_LIMIT");
    }

    const device = await this.roomRepository.createDevice(input);
    return { id: device.id };
  }

  async delete(roomId: string, userId: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    await this.roomRepository.delete(roomId);
  }
}
