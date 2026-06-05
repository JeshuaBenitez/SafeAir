import { Sequelize } from "sequelize";
import { env } from "../../shared/config/env";
import { logger } from "../../shared/config/logger";

export const sequelize = new Sequelize({
  dialect: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  database: env.dbName,
  username: env.dbUser,
  password: env.dbPassword,
  logging: env.dbLogging,
  
  // Connection Pool Configuration
  // Optimized for 2-3 concurrent frontend clients
  // Each client may have 2-5 concurrent queries
  pool: {
    // Maximum number of connections in the pool
    // Set to 10 to handle 2-3 clients with headroom
    max: 10,
    
    // Minimum number of connections to maintain
    // Set to 2 for development efficiency
    min: 2,
    
    // Connection acquisition timeout (ms)
    // Wait up to 5 seconds if no connection available
    acquire: 5000,
    
    // Idle connection timeout (ms)
    // Close idle connections after 30 seconds
    idle: 30000,
    
    // Evict idle connections every 30 seconds
    evict: 30000,
    
    // Validate connection before use
    validate: () => true
  },
  
  // SSL Configuration (if enabled)
  dialectOptions: env.dbSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: env.dbSslRejectUnauthorized
        }
      }
    : undefined
});

export async function connectDatabase(): Promise<void> {
  await sequelize.authenticate();
  logger.info(`Database connected to ${env.dbHost}:${env.dbPort}/${env.dbName}`);
}

/**
 * Gracefully close database connection pool
 * 
 * Called on server shutdown to ensure:
 * - Pending queries are completed
 * - Connections are properly closed
 * - No resource leaks
 */
export async function closeDatabase(): Promise<void> {
  try {
    logger.info("Closing database connection pool...");
    await sequelize.close();
    logger.info("Database connection pool closed successfully");
  } catch (error) {
    logger.error("Error closing database connection pool", error);
  }
}
