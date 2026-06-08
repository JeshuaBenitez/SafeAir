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
  logger.info("[Database] Database synchronization completed successfully.");
}
