import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../shared/errors/app-error";
import { signToken } from "../../shared/security/jwt";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import type { LoginInput, LoginResponse, RegisterInput } from "../../domain/types/auth.types";

export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}

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

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const accessToken = signToken({ sub: user.id, role: user.role, email: user.email });
    const decoded = jwt.decode(accessToken) as jwt.JwtPayload | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return {
      authenticated: true,
      userId: user.id,
      displayName: user.fullName,
      tokenType: "Bearer",
      accessToken,
      expiresAt
    };
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
