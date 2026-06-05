import { z } from "zod";

/**
 * Login Schema - Accepts both 'email' and legacy 'identifier' for backward compatibility
 * 
 * During transition period (Option A from specification):
 * - Frontend can send either 'email' or 'identifier' (treated as email)
 * - Backend accepts both and normalizes to 'email' before validation
 * - This allows gradual migration without breaking existing clients
 * 
 * Eventually: Backend should only accept 'email' once all clients are migrated
 */
export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    identifier: z.string().optional(), // Legacy field, treated as email
    password: z.string().min(6)
  })
  .refine(
    (data) => data.email || data.identifier,
    {
      message: "Either 'email' or 'identifier' must be provided",
      path: ["email"]
    }
  );

export const registerSchema = z
  .object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6)
});

export const resendOtpSchema = z.object({
  email: z.string().email()
});
