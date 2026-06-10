import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { sendActuatorCommand } from "../../controllers/actuator.controller";

export const actuatorRouter = Router();

/**
 * Send command to actuator device
 * Flow: Frontend -> API -> EMQX -> Emulator
 * 
 * POST /api/v1/rooms/:roomId/actuators/:deviceType/command
 * 
 * Body:
 * {
 *   "action": "turn_on" | "turn_off" | "set_temperature",
 *   "value": boolean | number,
 *   "deviceIndex": 1,
 *   "source": "frontend" (optional)
 * }
 * 
 * Example:
 * curl -X POST http://localhost:3000/api/v1/rooms/{roomId}/actuators/minisplit/command \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <TOKEN>" \
 *   -d '{"action":"turn_on","value":true,"source":"frontend"}'
 */
actuatorRouter.post(
  "/rooms/:roomId/actuators/:deviceType/command",
  authMiddleware,
  (req, res, next) => {
    sendActuatorCommand(req, res).catch(next);
  }
);
