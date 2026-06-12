import { Op, UniqueConstraintError } from "sequelize";
import { EmulatorModel } from "../database/models";
import { InstanceModel } from "../database/models";
import { RoomModel } from "../database/models";
import { RoomSetupModel } from "../database/models";

export interface DebugRoomEmulatorDetails {
  emulatorExternalId: string | null;
  roomId: string | null;
  roomName: string;
  roomArea: number | null;
  windowCount: number | null;
  minisplitCount: number | null;
  purifierCount: number | null;
  extractorCount: number | null;
  minisplitSize: string | null;
  purifierSize: string | null;
  extractorSize: string | null;
  status: string;
  hasEmulator: boolean;
  ownedByUser: boolean;
  assignmentStatus: "assigned" | "room-without-emulator" | "free";
}

export class EmulatorRepository {
  async findByExternalId(externalId: string): Promise<EmulatorModel | null> {
    return EmulatorModel.findOne({ where: { emulatorExternalId: externalId } });
  }

  async findByRoomId(roomId: string): Promise<EmulatorModel | null> {
    return EmulatorModel.findOne({ where: { roomId } });
  }

  async create(data: { roomId: string | null; emulatorExternalId: string; status?: "online" | "offline" }): Promise<EmulatorModel> {
    return EmulatorModel.create({
      roomId: data.roomId,
      emulatorExternalId: data.emulatorExternalId,
      status: data.status ?? "online"
    });
  }

  async findFirstAvailable(): Promise<EmulatorModel | null> {
    return EmulatorModel.findOne({
      where: {
        roomId: null,
        status: "online"
      },
      order: [["createdAt", "ASC"]]
    });
  }

  async assignToRoom(emulatorId: string, roomId: string): Promise<EmulatorModel | null> {
    const emulator = await EmulatorModel.findOne({
      where: {
        [Op.or]: [
          { id: emulatorId },
          { emulatorExternalId: emulatorId }
        ]
      }
    });
    if (!emulator) {
      return null;
    }

    emulator.roomId = roomId;
    await emulator.save();
    return emulator;
  }

  async assignFirstAvailableToRoom(roomId: string, preferredPrefix = "EMU-U"): Promise<EmulatorModel | null> {
    const existing = await this.findByRoomId(roomId);
    if (existing) {
      return existing;
    }

    try {
      return await EmulatorModel.sequelize!.transaction(async (transaction) => {
        const alreadyAssigned = await EmulatorModel.findOne({
          where: { roomId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (alreadyAssigned) {
          return alreadyAssigned;
        }

        const emulator = await EmulatorModel.findOne({
          where: {
            roomId: null,
            status: "online",
            emulatorExternalId: { [Op.like]: `${preferredPrefix}%` }
          },
          order: [["emulatorExternalId", "ASC"]],
          transaction,
          lock: transaction.LOCK.UPDATE,
          skipLocked: true
        });

        if (!emulator) {
          return null;
        }

        emulator.roomId = roomId;
        await emulator.save({ transaction });
        return emulator;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        return this.findByRoomId(roomId);
      }

      throw error;
    }
  }

  async createOrAssignToRoom(data: { roomId: string; emulatorExternalId: string }): Promise<EmulatorModel> {
    try {
      return await EmulatorModel.sequelize!.transaction(async (transaction) => {
        const existingForRoom = await EmulatorModel.findOne({
          where: { roomId: data.roomId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (existingForRoom) {
          return existingForRoom;
        }

        const existingForExternalId = await EmulatorModel.findOne({
          where: { emulatorExternalId: data.emulatorExternalId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });

        if (existingForExternalId) {
          if (existingForExternalId.roomId && existingForExternalId.roomId !== data.roomId) {
            throw new Error(`Emulator ${data.emulatorExternalId} is already assigned to room ${existingForExternalId.roomId}`);
          }

          existingForExternalId.roomId = data.roomId;
          existingForExternalId.status = "online";
          await existingForExternalId.save({ transaction });
          return existingForExternalId;
        }

        return EmulatorModel.create({
          roomId: data.roomId,
          emulatorExternalId: data.emulatorExternalId,
          status: "online"
        }, { transaction });
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const existing = await this.findByRoomId(data.roomId);
        if (existing) {
          return existing;
        }
      }

      throw error;
    }
  }

  async findAssignedExternalIdsByUser(userId: string): Promise<string[]> {
    const emulators = await EmulatorModel.findAll({
      where: { roomId: { [Op.ne]: null } },
      attributes: ["emulatorExternalId"],
      include: [
        {
          model: RoomModel,
          as: "room",
          required: true,
          include: [
            {
              model: InstanceModel,
              as: "instance",
              where: { userId },
              required: true,
              attributes: []
            }
          ],
          attributes: []
        }
      ]
    });

    return emulators.map((emulator) => emulator.emulatorExternalId);
  }

  async releaseRoom(roomId: string): Promise<void> {
    await EmulatorModel.update({ roomId: null }, { where: { roomId } });
  }

  async findAllWithRooms(): Promise<EmulatorModel[]> {
    return EmulatorModel.findAll({
      include: [
        {
          model: RoomModel,
          as: "room",
          required: false,
          include: [
            {
              model: InstanceModel,
              as: "instance",
              required: false,
              attributes: ["id", "userId", "name"]
            }
          ]
        }
      ],
      order: [["createdAt", "ASC"]]
    });
  }

  async findAssigned(): Promise<EmulatorModel[]> {
    return EmulatorModel.findAll({
      where: { roomId: { [Op.ne]: null } },
      include: [
        {
          model: RoomModel,
          as: "room",
          required: false,
          include: [
            {
              model: InstanceModel,
              as: "instance",
              required: false,
              attributes: ["id", "userId", "name"]
            }
          ]
        }
      ],
      order: [["createdAt", "ASC"]]
    });
  }

  async findAssignedToUser(userId: string): Promise<EmulatorModel[]> {
    return EmulatorModel.findAll({
      where: { roomId: { [Op.ne]: null } },
      include: [
        {
          model: RoomModel,
          as: "room",
          required: true,
          include: [
            {
              model: InstanceModel,
              as: "instance",
              where: { userId },
              required: true,
              attributes: ["id", "userId", "name"]
            }
          ]
        }
      ],
      order: [["createdAt", "ASC"]]
    });
  }

  async findFree(): Promise<EmulatorModel[]> {
    return EmulatorModel.findAll({
      where: { roomId: null },
      order: [["createdAt", "ASC"]]
    });
  }

  /**
   * Find all emulators with their room details for dashboard display.
   * Returns enhanced emulator data including room name and setup.
   */
  private mapRoomDebugDetails(room: RoomModel, ownedByUser: boolean): DebugRoomEmulatorDetails {
    const setup = room.get("setup") as RoomSetupModel | null;
    const emulator = room.get("emulator") as EmulatorModel | null;

    return {
      emulatorExternalId: emulator?.emulatorExternalId ?? null,
      roomId: room.id,
      roomName: room.name,
      roomArea: setup ? Math.round(setup.roomWidth * setup.roomLength * 10) / 10 : null,
      windowCount: setup?.windowCount ?? null,
      minisplitCount: setup?.minisplitCount ?? null,
      purifierCount: setup?.purifierCount ?? null,
      extractorCount: setup?.extractorCount ?? null,
      minisplitSize: setup?.minisplitSize ?? null,
      purifierSize: setup?.purifierSize ?? null,
      extractorSize: setup?.extractorSize ?? null,
      status: emulator?.status ?? "unassigned",
      hasEmulator: Boolean(emulator),
      ownedByUser,
      assignmentStatus: emulator ? "assigned" as const : "room-without-emulator" as const
    };
  }

  private mapFreeEmulatorDebugDetails(emulator: EmulatorModel): DebugRoomEmulatorDetails {
    return {
      emulatorExternalId: emulator.emulatorExternalId,
      roomId: null,
      roomName: "Sin room asignado",
      roomArea: null,
      windowCount: null,
      minisplitCount: null,
      purifierCount: null,
      extractorCount: null,
      minisplitSize: null,
      purifierSize: null,
      extractorSize: null,
      status: emulator.status,
      hasEmulator: true,
      ownedByUser: false,
      assignmentStatus: "free" as const
    };
  }

  async findAllForUserDebug(userId: string): Promise<DebugRoomEmulatorDetails[]> {
    const rooms = await RoomModel.findAll({
      include: [
        {
          model: InstanceModel,
          as: "instance",
          where: { userId },
          required: true
        },
        {
          model: RoomSetupModel,
          as: "setup",
          required: false
        },
        {
          model: EmulatorModel,
          as: "emulator",
          required: false
        }
      ],
      order: [
        ["createdAt", "ASC"]
      ]
    });

    return rooms.map((room) => this.mapRoomDebugDetails(room, true));
  }

  async findAllGlobalDebug(viewerUserId?: string): Promise<DebugRoomEmulatorDetails[]> {
    const rooms = await RoomModel.findAll({
      include: [
        {
          model: InstanceModel,
          as: "instance",
          required: false
        },
        {
          model: RoomSetupModel,
          as: "setup",
          required: false
        },
        {
          model: EmulatorModel,
          as: "emulator",
          required: false
        }
      ],
      order: [
        ["createdAt", "ASC"]
      ]
    });

    const roomRows = rooms.map((room) => {
      const instance = room.get("instance") as InstanceModel | null;
      return this.mapRoomDebugDetails(room, Boolean(viewerUserId && instance?.userId === viewerUserId));
    });

    const freeEmulators = await this.findFree();
    const freeRows = freeEmulators.map((emulator) => this.mapFreeEmulatorDebugDetails(emulator));

    return [...roomRows, ...freeRows];
  }

  async findAllWithRoomDetails(userId: string): Promise<DebugRoomEmulatorDetails[]> {
    return this.findAllForUserDebug(userId);
  }
}
