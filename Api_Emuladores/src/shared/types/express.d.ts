import type { JwtPayload } from "../../domain/types/auth.types";

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export {};
