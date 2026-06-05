import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../../shared/errors/app-error";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      next(new AppError("Validation error", 422, "VALIDATION_ERROR", parsed.error.format()));
      return;
    }

    req.body = parsed.data;
    next();
  };
}
