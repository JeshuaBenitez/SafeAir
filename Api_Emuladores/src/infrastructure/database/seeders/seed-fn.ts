import bcrypt from "bcryptjs";
import {
  EmulatorModel,
  UserModel
} from "../models";

const MANAGED_USER_COUNT = 10;
const MANAGED_ROOMS_PER_USER = 3;
const MANAGED_EMULATOR_IDS = Array.from({ length: MANAGED_USER_COUNT }, (_, userIndex) =>
  Array.from(
    { length: MANAGED_ROOMS_PER_USER },
    (_, roomIndex) => `EMU-U${String(userIndex + 1).padStart(3, "0")}-R${String(roomIndex + 1).padStart(3, "0")}`
  )
).flat();

const LEGACY_SEED_EMULATOR_IDS = ["EMU-0001", "EMU-0002", "emu-room-a"] as const;
const SEED_EMULATOR_IDS = [...MANAGED_EMULATOR_IDS, ...LEGACY_SEED_EMULATOR_IDS] as const;
const LEGACY_SEED_EMULATOR_STATUS: Record<typeof LEGACY_SEED_EMULATOR_IDS[number], "online" | "offline"> = {
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
  for (const emulatorExternalId of SEED_EMULATOR_IDS) {
    await EmulatorModel.findOrCreate({
      where: { emulatorExternalId },
      defaults: {
        roomId: null,
        emulatorExternalId,
        status: emulatorExternalId.startsWith("EMU-U")
          ? "online"
          : LEGACY_SEED_EMULATOR_STATUS[emulatorExternalId as typeof LEGACY_SEED_EMULATOR_IDS[number]]
      }
    });
  }
}
