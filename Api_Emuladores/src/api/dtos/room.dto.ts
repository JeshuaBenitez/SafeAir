import { z } from "zod";

export const createRoomSchema = z.object({
  instanceId: z.string().uuid(),
  name: z.string().min(2).max(100)
});

export const updateRoomSchema = z.object({
  name: z.string().min(2).max(100).optional()
});

export const upsertRoomSetupSchema = z.object({
  roomWidth: z.number().positive(),
  roomLength: z.number().positive(),
  roomHeight: z.number().positive(),
  windowCount: z.number().int().min(0).max(6),
  windowAreaTotal: z.number().min(0),
  minisplitCount: z.number().int().min(1).max(3),
  purifierCount: z.number().int().min(1).max(3),
  extractorCount: z.number().int().min(1).max(3)
});

export const createDeviceSchema = z.object({
  type: z.enum(["minisplit", "purifier", "extractor"]),
  label: z.string().min(2).max(80)
});
