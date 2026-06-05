import { connectDatabase, sequelize } from "../sequelize";
import { initModelAssociations } from "../models";
import { syncModels } from "../sync";
import { runDatabaseSeed } from "./seed-fn";

async function cleanUsers(): Promise<void> {
  try {
    console.log("[Database] Conectando a la base de datos para limpiar usuarios...");
    await connectDatabase();
    initModelAssociations();

    // Sincronizar modelos primero para asegurar que las columnas nuevas existan
    console.log("[Database] Asegurando la estructura correcta de la base de datos...");
    await syncModels();

    // Eliminar todos los usuarios
    console.log("[Database] Limpiando la tabla de usuarios...");
    await sequelize.query('TRUNCATE TABLE users CASCADE;');

    console.log("[Database] Restaurando la cuenta administrativa de semilla por defecto...");
    await runDatabaseSeed();

    console.log("=============================================================");
    console.log("¡ÉXITO! Base de datos de usuarios limpiada de forma segura.");
    console.log("Se ha restaurado el usuario semilla por defecto:");
    console.log("  - Usuario: admin@safeair.local");
    console.log("  - Contraseña: 12345678");
    console.log("=============================================================");
    
    process.exit(0);
  } catch (error) {
    console.error("[Database] Error al limpiar la base de datos de usuarios:", error);
    process.exit(1);
  }
}

void cleanUsers();
