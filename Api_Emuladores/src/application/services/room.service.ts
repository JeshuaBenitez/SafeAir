import { AppError } from "../../shared/errors/app-error";
import { EmulatorRepository } from "../../infrastructure/repositories/emulator.repository";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { RoomSetupDomainService } from "../../domain/services/room-setup-domain.service";
import { ConfigurationService } from "./configuration.service";
import { EmulatorProvisioningService } from "./emulator-provisioning.service";
import { addLog } from "./debug-logs.service";
import type { RoomSetupInput } from "../../domain/types/room.types";

const MAX_SUPPORTED_OPERATORS = 10;
const MAX_ROOMS_PER_USER = 3;

export class RoomService {
  constructor(
    private readonly instanceRepository: InstanceRepository,
    private readonly roomRepository: RoomRepository,
    private readonly emulatorRepository: EmulatorRepository,
    private readonly userRepository: UserRepository,
    private readonly roomSetupDomainService: RoomSetupDomainService,
    private readonly configurationService: ConfigurationService,
    private readonly emulatorProvisioningService: EmulatorProvisioningService
  ) {}

  async create(input: { instanceId?: string; name: string }, userId: string): Promise<{ id: string; emulatorExternalId: string; emulatorAssigned: boolean; emulatorProvisionRequested: boolean }> {
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room.create.started",
      message: `Creating room "${input.name}"`,
      details: { userId, instanceId: input.instanceId ?? null }
    });

    const instance = input.instanceId
      ? await this.instanceRepository.findById(input.instanceId, userId)
      : await this.findOrCreateDefaultInstance(userId);

    if (!instance) {
      throw new AppError("Instance not found", 404, "INSTANCE_NOT_FOUND");
    }

    const userRoomCount = await this.instanceRepository.countRoomsByUser(userId);
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room.create.limit-checked",
      message: `User has ${userRoomCount}/${MAX_ROOMS_PER_USER} rooms before creation`,
      details: { userId, userRoomCount, maxRoomsPerUser: MAX_ROOMS_PER_USER }
    });

    if (userRoomCount >= MAX_ROOMS_PER_USER) {
      throw new AppError("Maximum 3 rooms per user", 422, "MAX_ROOMS_REACHED");
    }

    const emulatorExternalId = await this.nextEmulatorExternalId(userId);
    const room = await this.roomRepository.create({ instanceId: instance.id, name: input.name });
    const emulator = await this.emulatorRepository.createOrAssignToRoom({ roomId: room.id, emulatorExternalId });

    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "room.create.emulator-assigned",
      message: `Room created and assigned to emulator ${emulator.emulatorExternalId}`,
      details: {
        roomId: room.id,
        roomName: room.name,
        userId,
        emulatorExternalId: emulator.emulatorExternalId
      },
      roomId: room.id,
      emulatorId: emulator.emulatorExternalId
    });

    try {
      await this.emulatorProvisioningService.requestProvision({
        emulatorExternalId: emulator.emulatorExternalId,
        roomId: room.id,
        userId
      });

      addLog({
        timestamp: new Date().toISOString(),
        level: "info",
        source: "api",
        event: "room.create.completed",
        message: `Room "${room.name}" created with emulator ${emulator.emulatorExternalId}`,
        details: { roomId: room.id, roomName: room.name, userId, emulatorExternalId: emulator.emulatorExternalId },
        roomId: room.id,
        emulatorId: emulator.emulatorExternalId
      });

      return { id: room.id, emulatorExternalId: emulator.emulatorExternalId, emulatorAssigned: true, emulatorProvisionRequested: true };
    } catch (error) {
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "api",
        event: "room.create.failed",
        message: error instanceof Error ? error.message : String(error),
        details: { roomId: room.id, roomName: room.name, userId, emulatorExternalId: emulator.emulatorExternalId },
        roomId: room.id,
        emulatorId: emulator.emulatorExternalId
      });
      throw new AppError("Room created but emulator provision request failed", 503, "EMULATOR_PROVISION_FAILED");
    }
  }

  async list(userId?: string): Promise<unknown[]> {
    return this.roomRepository.findAll({ userId });
  }

  async getById(roomId: string, userId?: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return room;
  }

  async update(roomId: string, input: { name?: string }, userId?: string): Promise<void> {
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
          minisplitSize: setup.minisplitSize,
          purifierSize: setup.purifierSize,
          extractorSize: setup.extractorSize,
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

  async getSetup(roomId: string, userId?: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return {
      setup: room.get("setup"),
      derived: room.get("derivedSetup")
    };
  }

  async listDevices(roomId: string, userId?: string): Promise<unknown[]> {
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

  async delete(roomId: string, userId?: string): Promise<void> {
    const room = await this.roomRepository.findById(roomId, userId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    await this.roomRepository.delete(roomId);
  }

  private async findOrCreateDefaultInstance(userId: string) {
    const instance = await this.instanceRepository.findFirstActive(userId);
    if (instance) {
      return instance;
    }

    return this.instanceRepository.create({
      userId,
      name: "Default Instance",
      description: "Created automatically for CLI room management"
    });
  }

  private async nextEmulatorExternalId(userId: string): Promise<string> {
    const operatorIndex = await this.userRepository.getOperatorProvisioningIndex(userId);
    if (!operatorIndex || operatorIndex > MAX_SUPPORTED_OPERATORS) {
      throw new AppError("User is outside the supported provisioning range", 422, "USER_LIMIT_REACHED");
    }

    const userCode = String(operatorIndex).padStart(3, "0");
    const assignedIds = new Set(await this.emulatorRepository.findAssignedExternalIdsByUser(userId));

    for (let roomIndex = 1; roomIndex <= MAX_ROOMS_PER_USER; roomIndex += 1) {
      const candidate = `EMU-U${userCode}-R${String(roomIndex).padStart(3, "0")}`;
      if (!assignedIds.has(candidate)) {
        return candidate;
      }
    }

    throw new AppError("Maximum 3 rooms per user", 422, "MAX_ROOMS_REACHED");
  }
}
