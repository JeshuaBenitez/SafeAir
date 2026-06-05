import { z } from "zod";

export const publishConfigSchema = z.object({
  emulatorId: z.string().min(1),
  targetTemperature: z.number().optional(),
  targetHumidity: z.number().optional(),
  strategy: z.string().optional()
});
