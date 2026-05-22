import { env } from "../../shared/config/env";
import { sequelize } from "./sequelize";

export async function syncModels(): Promise<void> {
  if (env.nodeEnv === "production" && !env.dbSyncOnStartup) {
    return;
  }

  await sequelize.sync({ alter: env.nodeEnv !== "production" });
}
