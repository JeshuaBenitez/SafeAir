import { connectDatabase } from "../sequelize";
import { initModelAssociations } from "../models";
import { syncModels } from "../sync";
import { runDatabaseSeed } from "./seed-fn";

async function seed(): Promise<void> {
  await connectDatabase();
  initModelAssociations();
  await syncModels();

  await runDatabaseSeed();

  // eslint-disable-next-line no-console
  console.log("Seed completed");
  process.exit(0);
}

void seed();
