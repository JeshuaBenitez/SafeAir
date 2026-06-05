import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../../shared/config/env";
import { AppError } from "../../shared/errors/app-error";

export function telemetryApiKeyMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const providedKey = req.header("x-api-key")?.trim();

  if (!providedKey) {
    next(new AppError("Missing API key", 401, "UNAUTHORIZED"));
    return;
  }

  const expectedBuffer = Buffer.from(env.telemetryApiKey, "utf8");
  const providedBuffer = Buffer.from(providedKey, "utf8");

  if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
    next(new AppError("Invalid API key", 401, "UNAUTHORIZED"));
    return;
  }

  next();
}
