import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { MAX_SUPPORTED_OPERATORS } from "../../application/services/user-provisioning.service";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { AppError } from "../../shared/errors/app-error";

type UserRole = "admin" | "operator";

const userRepository = new UserRepository();

function normalizeEmail(email: unknown): string {
  if (typeof email !== "string" || !email.includes("@")) {
    throw new AppError("Valid email is required", 422, "INVALID_EMAIL");
  }

  return email.trim().toLowerCase();
}

function buildFullName(input: { firstName?: unknown; lastName?: unknown; fullName?: unknown }, fallback?: string): string {
  if (typeof input.fullName === "string" && input.fullName.trim()) {
    return input.fullName.trim();
  }

  const firstName = typeof input.firstName === "string" ? input.firstName.trim() : "";
  const lastName = typeof input.lastName === "string" ? input.lastName.trim() : "";
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || fallback || "";
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? "";
  return { firstName, lastName: parts.join(" ") };
}

function serializeUser(user: { id: string; email: string; fullName: string; role: string; enabled: boolean; createdAt?: Date; updatedAt?: Date }) {
  const { firstName, lastName } = splitName(user.fullName);
  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    fullName: user.fullName,
    role: user.role,
    enabled: user.enabled,
    status: user.enabled ? "active" : "disabled",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function parseRole(value: unknown, fallback: UserRole = "operator"): UserRole {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === "admin" || value === "operator") return value;
  throw new AppError("role must be admin or operator", 422, "INVALID_ROLE");
}

export class UserController {
  async list(_req: Request, res: Response): Promise<void> {
    const req = _req;
    if (typeof req.query.email === "string") {
      const user = await userRepository.findByEmail(req.query.email);
      if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }
      res.status(200).json(serializeUser(user));
      return;
    }

    const users = await userRepository.findAll();
    res.status(200).json({ count: users.length, users: users.map(serializeUser) });
  }

  async get(req: Request, res: Response): Promise<void> {
    const user = await this.findUser(req);
    res.status(200).json(serializeUser(user));
  }

  async create(req: Request, res: Response): Promise<void> {
    const email = normalizeEmail(req.body.email);
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
    }

    const role = parseRole(req.body.role);
    if (role === "operator") {
      const operatorCount = await userRepository.countOperators();
      if (operatorCount >= MAX_SUPPORTED_OPERATORS) {
        throw new AppError("Maximum supported users reached for this delivery", 422, "USER_LIMIT_REACHED");
      }
    }

    if (typeof req.body.password !== "string" || req.body.password.length < 6) {
      throw new AppError("password must contain at least 6 characters", 422, "INVALID_PASSWORD");
    }

    const fullName = buildFullName(req.body);
    if (!fullName) {
      throw new AppError("firstName/lastName or fullName is required", 422, "INVALID_NAME");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const user = await userRepository.create({
      email,
      passwordHash,
      fullName,
      role,
      enabled: req.body.enabled === undefined ? true : this.parseEnabled(req.body.enabled)
    });
    res.status(201).json(serializeUser(user));
  }

  async update(req: Request, res: Response): Promise<void> {
    const user = await this.findUser(req);
    const fullName = buildFullName(req.body, user.fullName);
    const role = parseRole(req.body.role, user.role);

    const updated = await userRepository.updateProfile(user.id, { fullName, role });
    res.status(200).json(serializeUser(updated ?? user));
  }

  async updateEmail(req: Request, res: Response): Promise<void> {
    const user = await this.findUser(req);
    const email = normalizeEmail(req.body.email ?? req.body.newEmail);
    const existing = await userRepository.findByEmail(email);
    if (existing && existing.id !== user.id) {
      throw new AppError("Email already registered", 409, "EMAIL_ALREADY_EXISTS");
    }

    const updated = await userRepository.updateProfile(user.id, { email });
    res.status(200).json(serializeUser(updated ?? user));
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    const user = await this.findUser(req);
    if (typeof req.body.password !== "string" || req.body.password.length < 6) {
      throw new AppError("password must contain at least 6 characters", 422, "INVALID_PASSWORD");
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    await userRepository.updateProfile(user.id, { passwordHash });
    res.status(204).send();
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const user = await this.findUser(req);
    const enabled = this.parseEnabled(req.body.enabled ?? req.body.status);
    const updated = await userRepository.updateProfile(user.id, { enabled });
    res.status(200).json(serializeUser(updated ?? user));
  }

  private async findUser(req: Request) {
    const id = String(req.params.id ?? "");
    const email = typeof req.query.email === "string" ? req.query.email : undefined;
    const user = email ? await userRepository.findByEmail(email) : await userRepository.findById(id);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  }

  private parseEnabled(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["active", "enabled", "true", "1"].includes(normalized)) return true;
      if (["disabled", "inactive", "false", "0"].includes(normalized)) return false;
    }

    throw new AppError("enabled boolean or status active/disabled is required", 422, "INVALID_USER_STATUS");
  }
}
