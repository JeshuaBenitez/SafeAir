import { z } from "zod";

export const createInstanceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional()
});
