import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import path from "path";
import { env } from "./shared/config/env";
import { requestLoggerMiddleware } from "./api/middlewares/request-logger.middleware";
import { requestAuditMiddleware } from "./api/middlewares/request-audit.middleware";
import { notFoundMiddleware } from "./api/middlewares/not-found.middleware";
import { errorMiddleware } from "./api/middlewares/error.middleware";
import { v1Router } from "./api/routes/v1";
import { debugRouter } from "./api/routes/debug.routes";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: env.corsOrigins,
    credentials: true
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestAuditMiddleware);
  app.use(requestLoggerMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Serve static debug assets (JS files)
  // These are served from /debug/assets/* path
  // In production: files are in /app/public (copied from src/public)
  // In development: files are in src/public (TypeScript excludes this from build)
  const publicPath = path.join(__dirname, "..", "public");
  app.use("/debug/assets", express.static(publicPath, {
    maxAge: "1h",
    etag: true,
    index: false
  }));

  // Debug endpoints (accessible in development/demo mode)
  app.use("/debug", debugRouter);

  app.use(env.apiPrefix, v1Router);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
