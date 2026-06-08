import { EmulatorModel } from "../database/models";
import { InstanceModel } from "../database/models";
import { RoomModel } from "../database/models";
import { RoomSetupModel } from "../database/models";

export interface DebugRoomEmulatorDetails {
  emulatorExternalId: string | null;
  roomId: string;
  roomName: string;
  roomArea: number | null;
  windowCount: number | null;
  minisplitCount: number | null;
  purifierCount: number | null;
  extractorCount: number | null;
  status: string;
  hasEmulator: boolean;
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
        roomId: null
      },
      order: [["createdAt", "ASC"]]
    });
  }

  async assignToRoom(emulatorId: string, roomId: string): Promise<EmulatorModel | null> {
    const emulator = await EmulatorModel.findByPk(emulatorId);
    if (!emulator) {
      return null;
    }

    emulator.roomId = roomId;
    await emulator.save();
    return emulator;
  }

  async findAllWithRooms(): Promise<EmulatorModel[]> {
    return EmulatorModel.findAll({
      order: [["createdAt", "ASC"]]
    });
  }

  /**
   * Find all emulators with their room details for dashboard display.
   * Returns enhanced emulator data including room name and setup.
   */
  async findAllWithRoomDetails(userId: string): Promise<DebugRoomEmulatorDetails[]> {
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

    return rooms.map((room) => {
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
        status: emulator?.status ?? "unassigned",
        hasEmulator: Boolean(emulator)
      };
    });
  }
}
