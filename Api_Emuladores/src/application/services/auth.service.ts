import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../shared/errors/app-error";
import { signToken } from "../../shared/security/jwt";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { EmailService } from "./email.service";
import type { LoginInput, LoginResponse, LoginResult, RegisterInput } from "../../domain/types/auth.types";

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService
  ) {}

  async register(input: RegisterInput): Promise<{ id: string; email: string; fullName: string; role: string }> {
    if (input.password !== input.confirmPassword) {
      throw new AppError("Passwords do not match", 422, "PASSWORD_MISMATCH");
    }

    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const fullName = `${input.firstName} ${input.lastName}`.trim();

    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      fullName,
      role: "operator"
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Generar OTP de 6 dígitos aleatorio
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos de validez

    // Guardar OTP en base de datos
    user.otpCode = code;
    user.otpExpiresAt = expiresAt;
    await user.save();

    // Enviar correo con OTP
    await this.emailService.sendOtpEmail(user.email, user.fullName, code);

    return {
      requiresOtp: true,
      email: user.email
    };
  }

  async verifyOtp(email: string, code: string): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      throw new AppError("No active verification code found. Request a new one.", 400, "NO_OTP_CODE");
    }

    if (new Date(user.otpExpiresAt).getTime() <= Date.now()) {
      throw new AppError("Verification code has expired. Request a new one.", 400, "OTP_EXPIRED");
    }

    if (user.otpCode !== code) {
      throw new AppError("Invalid verification code.", 400, "INVALID_OTP");
    }

    // Limpiar campos OTP en base de datos al autenticar exitosamente
    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    const accessToken = signToken({ sub: user.id, role: user.role, email: user.email });
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;
    const jwtExpiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      authenticated: true,
      userId: user.id,
      displayName: user.fullName,
      email: user.email,
      tokenType: "Bearer",
      accessToken,
      expiresAt: jwtExpiresAt
    };
  }

  async resendOtp(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Generar y guardar nuevo OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.otpCode = code;
    user.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    // Enviar correo
    await this.emailService.sendOtpEmail(user.email, user.fullName, code);
  }

  async me(userId: string): Promise<{ id: string; email: string; fullName: string; role: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
  }
}
