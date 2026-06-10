import bcrypt from "bcryptjs";
import { Op } from "sequelize";
import {
  AlarmModel,
  CycleMeasurementModel,
  CycleModel,
  DeviceActionModel,
  DeviceModel,
  DeviceStateModel,
  EmulatorModel,
  InstanceModel,
  RoomModel,
  RoomSetupDerivedModel,
  RoomSetupModel,
  UserModel
} from "../models";

const SEED_EMULATOR_IDS = ["EMU-0001", "EMU-0002", "emu-room-a"] as const;
const LEGACY_DEMO_ROOM_NAMES = ["Room A", "Room EMU-0001", "Room EMU-0002"] as const;
const LEGACY_DEMO_INSTANCE_NAMES = ["Demo Instance", "SafeAir Auto Instance", "Auto Provisioned Instance"] as const;
const SEED_EMULATOR_STATUS: Record<typeof SEED_EMULATOR_IDS[number], "online" | "offline"> = {
  "EMU-0001": "online",
  "EMU-0002": "online",
  "emu-room-a": "offline"
};

export async function runDatabaseSeed(): Promise<void> {
  const passwordHash = await bcrypt.hash("admin123", 10);

  await UserModel.findOrCreate({
    where: { email: "admin@safeair.local" },
    defaults: {
      fullName: "SafeAir Admin",
      passwordHash,
      role: "admin"
    }
  });

  await ensureSeedEmulatorPool();
}

export async function ensureSeedEmulatorPool(): Promise<void> {
  await removeLegacyDemoRooms();

  for (const emulatorExternalId of SEED_EMULATOR_IDS) {
    await EmulatorModel.findOrCreate({
      where: { emulatorExternalId },
      defaults: { roomId: null, emulatorExternalId, status: SEED_EMULATOR_STATUS[emulatorExternalId] }
    });
  }
}

async function removeLegacyDemoRooms(): Promise<void> {
  const legacyRooms = await RoomModel.findAll({
    where: { name: { [Op.in]: [...LEGACY_DEMO_ROOM_NAMES] } },
    include: [
      {
        model: InstanceModel,
        as: "instance",
        required: false
      }
    ]
  });

  const legacyRoomIds = legacyRooms
    .filter((room) => {
      const instance = room.get("instance") as InstanceModel | null;
      return !instance || LEGACY_DEMO_INSTANCE_NAMES.includes(instance.name as typeof LEGACY_DEMO_INSTANCE_NAMES[number]);
    })
    .map((room) => room.id);

  if (legacyRoomIds.length > 0) {
    await EmulatorModel.update({ roomId: null }, { where: { roomId: { [Op.in]: legacyRoomIds } } });
    await DeviceStateModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await AlarmModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await DeviceActionModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await CycleMeasurementModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await CycleModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await DeviceModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await RoomSetupDerivedModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await RoomSetupModel.destroy({ where: { roomId: { [Op.in]: legacyRoomIds } } });
    await RoomModel.destroy({ where: { id: { [Op.in]: legacyRoomIds } } });
  }

  const emptyLegacyInstances = await InstanceModel.findAll({
    where: { name: { [Op.in]: [...LEGACY_DEMO_INSTANCE_NAMES] } }
  });

  for (const instance of emptyLegacyInstances) {
    const roomCount = await RoomModel.count({ where: { instanceId: instance.id } });
    if (roomCount === 0) {
      await instance.destroy();
    }
  }
}
