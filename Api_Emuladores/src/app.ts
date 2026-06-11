import cors from "cors";
import express, { type Express } from "express";
import { existsSync } from "fs";
import helmet from "helmet";
import path from "path";
import { env } from "./shared/config/env";
import { requestLoggerMiddleware } from "./api/middlewares/request-logger.middleware";
import { requestAuditMiddleware } from "./api/middlewares/request-audit.middleware";
import { notFoundMiddleware } from "./api/middlewares/not-found.middleware";
import { errorMiddleware } from "./api/middlewares/error.middleware";
import { v1Router } from "./api/routes/v1";
import { debugRouter } from "./api/routes/debug.routes";

function resolveDebugAssetsPath(): string {
  const sourcePublicPath = path.resolve(process.cwd(), "src", "public");
  const rootPublicPath = path.resolve(process.cwd(), "public");
  const distPublicPath = path.resolve(__dirname, "..", "public");
  const adjacentPublicPath = path.resolve(__dirname, "public");
  const isRunningFromSource = path.basename(__dirname) === "src";
  const candidates = isRunningFromSource
    ? [sourcePublicPath, rootPublicPath, distPublicPath, adjacentPublicPath]
    : [rootPublicPath, distPublicPath, sourcePublicPath, adjacentPublicPath];

  const selected = candidates.find((candidate) =>
    existsSync(path.join(candidate, "debug-emulators.js")) &&
    existsSync(path.join(candidate, "debug-logs.js"))
  ) ?? candidates.find((candidate) => existsSync(candidate)) ?? rootPublicPath;

  console.info(`[DebugAssets] Serving debug assets from ${selected}`);
  return selected;
}

function setNoStoreHeaders(res: express.Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

export function createApp(): Express {
  const app = express();
  app.disable("etag");

  app.use(helmet());
  app.use(cors({
    origin: env.corsOrigins,
    credentials: true
  }));
  app.use(express.json({ limit: "1mb" }));
  app.use(requestAuditMiddleware);
  app.use(requestLoggerMiddleware);

  app.use((req, res, next) => {
    const isLiveEndpoint =
      req.path.startsWith("/debug") ||
      /^\/api\/v1\/rooms\/[^/]+\/metrics\/current$/.test(req.path) ||
      /^\/api\/v1\/rooms\/[^/]+\/actuators\/state$/.test(req.path);

    if (isLiveEndpoint) {
      setNoStoreHeaders(res);
      res.setHeader("Surrogate-Control", "no-store");
    }

    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  const publicPath = resolveDebugAssetsPath();
  app.use("/debug/assets", (_req, res, next) => {
    setNoStoreHeaders(res);
    next();
  });
  app.use("/debug/assets", express.static(publicPath, {
    etag: false,
    fallthrough: false,
    index: false,
    lastModified: false,
    maxAge: 0,
    setHeaders: (res, filePath) => {
      setNoStoreHeaders(res);
      if (filePath.endsWith(".js")) {
        res.setHeader("Content-Type", "application/javascript; charset=utf-8");
      }
    }
  }));

  // Debug endpoints (accessible in development/demo mode)
  app.use("/debug", debugRouter);

  app.use(env.apiPrefix, v1Router);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
