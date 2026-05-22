import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../../shared/security/jwt";
import { AppError } from "../../shared/errors/app-error";

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("Authorization");

  if (!header || !header.startsWith("Bearer ")) {
    next(new AppError("Missing token", 401, "UNAUTHORIZED"));
    return;
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(new AppError("Invalid token", 401, "UNAUTHORIZED"));
  }
}
