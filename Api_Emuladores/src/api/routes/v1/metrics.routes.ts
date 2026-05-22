import { Router } from "express";
import { MetricsController } from "../../controllers/metrics.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { telemetryApiKeyMiddleware } from "../../middlewares/telemetry-api-key.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { actuatorStateSchema } from "../../dtos/actuator-state.dto";
import { telemetrySchema } from "../../dtos/metrics.dto";

const controller = new MetricsController();
export const metricsRouter = Router();

metricsRouter.post("/telemetry", telemetryApiKeyMiddleware, validateBody(telemetrySchema), (req, res, next) => {
  controller.ingestTelemetry(req, res).catch(next);
});

metricsRouter.post("/actuators/state", telemetryApiKeyMiddleware, validateBody(actuatorStateSchema), (req, res, next) => {
  controller.ingestActuatorState(req, res).catch(next);
});

metricsRouter.get("/rooms/:id/metrics/current", authMiddleware, (req, res, next) => {
  controller.current(req, res).catch(next);
});

metricsRouter.get("/rooms/:id/metrics/history", authMiddleware, (req, res, next) => {
  controller.history(req, res).catch(next);
});

metricsRouter.get("/rooms/:id/actuators/state", authMiddleware, (req, res, next) => {
  controller.actuatorState(req, res).catch(next);
});
