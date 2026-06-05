import { z } from "zod";

export const actuatorStateSchema = z.object({
  emulatorId: z.string().min(1),
  roomId: z.string().uuid().optional(),
  deviceType: z.enum(["minisplit", "purifier", "extractor"]),
  isOn: z.boolean(),
  mode: z.string().optional(),
  targetTemperature: z.number().optional(),
  ambientTemperature: z.number().optional(),
  ambientHumidity: z.number().optional(),
  timestamp: z.string().datetime().optional()
});
