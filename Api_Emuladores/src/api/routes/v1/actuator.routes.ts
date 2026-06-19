import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { editEmulatorActuator, sendActuatorCommand } from "../../controllers/actuator.controller";

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
 * curl -X POST ${API_BASE_URL}/api/v1/rooms/{roomId}/actuators/minisplit/command \
 *   -H "Content-Type: application/json" \
 *   -H "Authorization: Bearer <TOKEN>" \
 *   -d '{"action":"turn_on","value":true,"source":"frontend"}'
 *
 * Note: Replace ${API_BASE_URL} with your API base URL (e.g., http://localhost:3000 or from environment)
 */
actuatorRouter.post(
  "/rooms/:roomId/actuators/:deviceType/command",
  authMiddleware,
  (req, res, next) => {
    sendActuatorCommand(req, res).catch(next);
  }
);

/**
 * Edit actuator behavior by emulator external ID.
 *
 * POST /api/v1/edit/emulador/:emulatorId
 */
actuatorRouter.post(
  "/edit/emulador/:emulatorId",
  authMiddleware,
  (req, res) => {
    editEmulatorActuator(req, res);
  }
);

/**
 * REST alias for the Spanish route above.
 *
 * POST /api/v1/emulators/:emulatorId/actuators
 */
actuatorRouter.post(
  "/emulators/:emulatorId/actuators",
  authMiddleware,
  (req, res) => {
    editEmulatorActuator(req, res);
  }
);
