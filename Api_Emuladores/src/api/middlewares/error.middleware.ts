import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error";
import { logger } from "../../shared/config/logger";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      code: error.code,
      details: error.details ?? null
    });
    return;
  }

  logger.error("Unhandled application error", error);
  res.status(500).json({
    message: "Unexpected server error",
    code: "INTERNAL_SERVER_ERROR"
  });
}
