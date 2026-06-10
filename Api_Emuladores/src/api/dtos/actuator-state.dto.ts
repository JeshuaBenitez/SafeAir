import { z } from "zod";

export const actuatorStateSchema = z.object({
  emulatorId: z.string().min(1),
  roomId: z.string().uuid().optional(),
  roomName: z.string().optional(),
  deviceType: z.enum(["minisplit", "purifier", "extractor"]),
  deviceIndex: z.number().int().min(1).max(3).optional().default(1),
  isOn: z.boolean(),
  mode: z.string().optional(),
  targetTemperature: z.number().optional(),
  ambientTemperature: z.number().optional(),
  ambientHumidity: z.number().optional(),
  timestamp: z.string().datetime().optional()
});
