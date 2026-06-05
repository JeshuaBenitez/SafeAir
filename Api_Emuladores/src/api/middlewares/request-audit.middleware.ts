import type { NextFunction, Request, Response } from "express";
import { ApiRequestLogRepository } from "../../infrastructure/repositories/api-request-log.repository";
import { logger } from "../../shared/config/logger";

const repository = new ApiRequestLogRepository();

// Track active requests for observability
let activeRequests = 0;

export function requestAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const receivedAt = new Date();
  activeRequests++;
  
  // Log request start
  const requestId = `${req.method} ${req.originalUrl} [${Date.now()}]`;
  logger.debug(`[Audit] Request started: ${requestId} (Active: ${activeRequests})`);

  res.on("finish", () => {
    const respondedAt = new Date();
    const durationMs = Math.max(0, respondedAt.getTime() - receivedAt.getTime());
    activeRequests--;

    // Log request completion
    logger.debug(
      `[Audit] Request completed: ${requestId} - Status: ${res.statusCode}, Duration: ${durationMs}ms (Active: ${activeRequests})`
    );

    // Persist audit record (async, don't wait for it)
    void repository
      .create({
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        receivedAt,
        respondedAt,
        durationMs,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null
      })
      .catch((error: unknown) => {
        logger.error("Failed to persist API request audit", error);
      });
  });

  next();
}

/**
 * Get current count of active requests
 * 
 * Useful for monitoring during load tests
 * Can be called from a health check or monitoring endpoint
 */
export function getActiveRequestCount(): number {
  return activeRequests;
}

/**
 * Reset active request counter
 * 
 * Useful for test cleanup or monitoring reset
 */
export function resetActiveRequestCount(): void {
  activeRequests = 0;
}
