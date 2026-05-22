import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./shared/config/env";
import { requestLoggerMiddleware } from "./api/middlewares/request-logger.middleware";
import { requestAuditMiddleware } from "./api/middlewares/request-audit.middleware";
import { notFoundMiddleware } from "./api/middlewares/not-found.middleware";
import { errorMiddleware } from "./api/middlewares/error.middleware";
import { v1Router } from "./api/routes/v1";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(requestAuditMiddleware);
  app.use(requestLoggerMiddleware);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.use(env.apiPrefix, v1Router);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
