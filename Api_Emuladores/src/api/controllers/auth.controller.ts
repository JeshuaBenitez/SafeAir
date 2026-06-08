import type { Request, Response } from "express";
import { container } from "../../application/container";
import { AppError } from "../../shared/errors/app-error";
import { addLog } from "../../application/services/debug-logs.service";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-register",
      message: `User registration attempt`,
      details: { email }
    });
    
    const result = await container.authService.register(req.body);
    
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-register-success",
      message: `User registered successfully`,
      details: { email }
    });
    
    res.status(201).json(result);
  }

  async login(req: Request, res: Response): Promise<void> {
    // Normalize payload: support both 'email' and legacy 'identifier'
    // Use safe destructuring to avoid 'password' being flagged as unused
    const normalizedBody = this.normalizeLoginPayload(req.body);
    const email = normalizedBody.email;
    
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-login-attempt",
      message: `Login attempt for user`,
      details: { email, skipOtp: req.body.skipOtp ?? false }
    });
    
    try {
      const result = await container.authService.login(normalizedBody);
      
      // Type guard: check if result has requiresOtp property (indicates OTP required)
      if ("requiresOtp" in result && typeof result.requiresOtp === "boolean" && result.requiresOtp) {
        addLog({
          timestamp: new Date().toISOString(),
          level: "info",
          source: "api",
          event: "auth-login-otp-required",
          message: `OTP required for user`,
          details: { email }
        });
      }
      
      // Type guard: check if result has accessToken property (login successful)
      if ("accessToken" in result && typeof result.accessToken === "string") {
        addLog({
          timestamp: new Date().toISOString(),
          level: "info",
          source: "api",
          event: "auth-login-success",
          message: `Login successful (OTP bypassed: demo mode)`,
          details: { email, tokenPrefix: result.accessToken.substring(0, 20) + "..." }
        });
      }
      
      res.status(200).json(result);
    } catch (err) {
      addLog({
        timestamp: new Date().toISOString(),
        level: "error",
        source: "api",
        event: "auth-login-failed",
        message: `Login failed: ${err instanceof Error ? err.message : String(err)}`,
        details: { email }
      });
      throw err;
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    if (!req.auth) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const result = await container.authService.me(req.auth.sub);
    res.status(200).json(result);
  }

  async verifyOtp(req: Request, res: Response): Promise<void> {
    const { email, code } = req.body;
    
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-otp-verify",
      message: `OTP verification attempt`,
      details: { email }
    });
    
    const result = await container.authService.verifyOtp(email, code);
    
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-otp-success",
      message: `OTP verified successfully`,
      details: { email }
    });
    
    res.status(200).json(result);
  }

  async resendOtp(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    
    addLog({
      timestamp: new Date().toISOString(),
      level: "info",
      source: "api",
      event: "auth-otp-resend",
      message: `OTP resend requested`,
      details: { email }
    });
    
    await container.authService.resendOtp(email);
    res.status(200).json({ message: "Verification code resent successfully." });
  }

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

