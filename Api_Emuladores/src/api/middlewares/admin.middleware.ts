import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error";

export function adminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== "admin") {
    next(new AppError("Admin permissions required", 403, "ADMIN_REQUIRED"));
    return;
  }

  next();
}
