import { DataTypes } from "sequelize";
import { sequelize } from "./sequelize";
import { logger } from "../../shared/config/logger";

export async function syncModels(): Promise<void> {
  logger.info("[Database] Synchronizing models with database schema (alter: true)...");
  // Always run alter: true so new columns (like otpCode, otpExpiresAt) are auto-generated on Render
  await sequelize.sync({ alter: true });
  await sequelize.getQueryInterface().changeColumn("emulators", "roomId", {
    type: DataTypes.UUID,
    allowNull: true
  });
  await dropLegacyDeviceStateUniqueIndex();
  logger.info("[Database] Database synchronization completed successfully.");
}

async function dropLegacyDeviceStateUniqueIndex(): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const indexes = await queryInterface.showIndex("device_states") as Array<{
    name: string;
    unique?: boolean;
    fields: Array<{ attribute: string }>;
  }>;

  for (const index of indexes) {
    const fields = index.fields.map((field: { attribute: string }) => field.attribute);
    const isLegacyUnique =
      index.unique &&
      fields.length === 2 &&
      fields.includes("roomId") &&
      fields.includes("deviceType");

    if (isLegacyUnique) {
      await queryInterface.removeIndex("device_states", index.name);
      logger.info(`[Database] Removed legacy device_states unique index: ${index.name}`);
    }
  }
}
