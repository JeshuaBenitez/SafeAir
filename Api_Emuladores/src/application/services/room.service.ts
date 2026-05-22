import { AppError } from "../../shared/errors/app-error";
import { InstanceRepository } from "../../infrastructure/repositories/instance.repository";
import { RoomRepository } from "../../infrastructure/repositories/room.repository";
import { RoomSetupDomainService } from "../../domain/services/room-setup-domain.service";
import type { RoomSetupInput } from "../../domain/types/room.types";

export class RoomService {
  constructor(
    private readonly instanceRepository: InstanceRepository,
    private readonly roomRepository: RoomRepository,
    private readonly roomSetupDomainService: RoomSetupDomainService
  ) {}

  async create(input: { instanceId: string; name: string }): Promise<{ id: string }> {
    const roomCount = await this.instanceRepository.countRooms(input.instanceId);
    if (roomCount >= 3) {
      throw new AppError("Maximum 3 rooms per instance", 422, "MAX_ROOMS_REACHED");
    }

    const room = await this.roomRepository.create(input);
    return { id: room.id };
  }

  async getById(roomId: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return room;
  }

  async update(roomId: string, input: { name?: string }): Promise<void> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    if (input.name) {
      room.name = input.name;
      await room.save();
    }
  }

  async upsertSetup(roomId: string, setup: RoomSetupInput): Promise<void> {
    const room = await this.roomRepository.findById(roomId);
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
  }

  async getSetup(roomId: string): Promise<unknown> {
    const room = await this.roomRepository.findById(roomId);
    if (!room) {
      throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
    }

    return {
      setup: room.get("setup"),
      derived: room.get("derivedSetup")
    };
  }

  async listDevices(roomId: string): Promise<unknown[]> {
    return this.roomRepository.listDevices(roomId);
  }

  async createDevice(input: { roomId: string; type: "minisplit" | "purifier" | "extractor"; label: string }): Promise<{ id: string }> {
    const devices = await this.roomRepository.listDevices(input.roomId);
    const sameTypeCount = devices.filter((device) => device.type === input.type).length;
    if (sameTypeCount >= 3) {
      throw new AppError(`Maximum 3 devices of type ${input.type} per room`, 422, "DEVICE_LIMIT");
    }

    const device = await this.roomRepository.createDevice(input);
    return { id: device.id };
  }
}
