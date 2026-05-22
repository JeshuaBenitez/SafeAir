import { z } from "zod";

export const telemetrySchema = z.object({
  emulatorId: z.string().min(1),
  roomId: z.string().uuid().optional(),
  temperature: z.number(),
  humidity: z.number(),
  co2: z.number(),
  pm25: z.number(),
  timestamp: z.string().datetime().optional()
});
