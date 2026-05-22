import type { Request, Response } from "express";
import { container } from "../../application/container";
import { AppError } from "../../shared/errors/app-error";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const result = await container.authService.register(req.body);
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    // Normalize payload: support both 'email' and legacy 'identifier'
    // Option A transition: accept 'identifier' but treat it as 'email'
    const normalizedBody = this.normalizeLoginPayload(req.body);
    
    const result = await container.authService.login(normalizedBody);
    res.status(200).json(result);
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const result = await container.authService.me(req.auth.sub);
    res.status(200).json(result);
  }

  /**
   * Normalize login payload to support both 'email' and legacy 'identifier' field
   * 
   * @param body - Raw request body with either 'email' or 'identifier'
   * @returns Normalized body with 'email' field (and optional 'identifier' removed)
   * 
   * Transitions:
   * - { email: 'user@example.com', password: '...' } → as-is (preferred)
   * - { identifier: 'user@example.com', password: '...' } → converted to email
   */
  private normalizeLoginPayload(body: any): { email: string; password: string } {
    const email = body.email || body.identifier;
    
    if (!email) {
      throw new AppError(
        "Either 'email' or 'identifier' must be provided",
        422,
        "MISSING_EMAIL_OR_IDENTIFIER"
      );
    }

    return {
      email: String(email).trim().toLowerCase(),
      password: body.password
    };
  }
}

