import bcrypt from "bcryptjs";
import { connectDatabase } from "../sequelize";
import { initModelAssociations, EmulatorModel, InstanceModel, RoomModel, RoomSetupDerivedModel, RoomSetupModel, UserModel, DeviceModel } from "../models";
import { syncModels } from "../sync";

async function seed(): Promise<void> {
  await connectDatabase();
  initModelAssociations();
  await syncModels();

  const passwordHash = await bcrypt.hash("admin123", 10);

  await UserModel.findOrCreate({
    where: { email: "admin@safeair.local" },
    defaults: {
      fullName: "SafeAir Admin",
      passwordHash,
      role: "admin"
    }
  });

  const [instance] = await InstanceModel.findOrCreate({
    where: { name: "Demo Instance" },
    defaults: { description: "Seed instance" }
  });

  const [room] = await RoomModel.findOrCreate({
    where: { name: "Room A", instanceId: instance.id },
    defaults: { instanceId: instance.id, name: "Room A" }
  });

  await RoomSetupModel.upsert({
    roomId: room.id,
    roomWidth: 5,
    roomLength: 6,
    roomHeight: 2.7,
    windowCount: 2,
    windowAreaTotal: 5,
    minisplitCount: 1,
    purifierCount: 1,
    extractorCount: 1
  });

  await RoomSetupDerivedModel.upsert({
    roomId: room.id,
    roomArea: 30,
    windowAreaRatio: 0.1667,
    windowFactorBase: 1.08335,
    windowFactor: 1.08335,
    areaTermica: 32.5005,
    areaCalidadAire: 31.5003
  });

  await EmulatorModel.findOrCreate({
    where: { emulatorExternalId: "emu-room-a" },
    defaults: { roomId: room.id, emulatorExternalId: "emu-room-a", status: "online" }
  });

  await DeviceModel.findOrCreate({ where: { roomId: room.id, type: "minisplit", label: "Minisplit A1" }, defaults: { roomId: room.id, type: "minisplit", label: "Minisplit A1" } });
  await DeviceModel.findOrCreate({ where: { roomId: room.id, type: "purifier", label: "Purifier A1" }, defaults: { roomId: room.id, type: "purifier", label: "Purifier A1" } });
  await DeviceModel.findOrCreate({ where: { roomId: room.id, type: "extractor", label: "Extractor A1" }, defaults: { roomId: room.id, type: "extractor", label: "Extractor A1" } });

  // eslint-disable-next-line no-console
  console.log("Seed completed");
  process.exit(0);
}

void seed();
