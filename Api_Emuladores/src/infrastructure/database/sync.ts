import { sequelize } from "./sequelize";
import { logger } from "../../shared/config/logger";

export async function syncModels(): Promise<void> {
  logger.info("[Database] Synchronizing models with database schema (alter: true)...");
  // Always run alter: true so new columns (like otpCode, otpExpiresAt) are auto-generated on Render
  await sequelize.sync({ alter: true });
  logger.info("[Database] Database synchronization completed successfully.");
}
