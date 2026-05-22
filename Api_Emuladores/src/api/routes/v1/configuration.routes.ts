import { Router } from "express";
import { ConfigurationController } from "../../controllers/configuration.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { publishConfigSchema } from "../../dtos/configuration.dto";

const controller = new ConfigurationController();
export const configurationRouter = Router();

configurationRouter.post("/rooms/:id/config/publish", authMiddleware, validateBody(publishConfigSchema), (req, res, next) => {
  controller.publish(req, res).catch(next);
});

configurationRouter.get("/rooms/:id/config", authMiddleware, (req, res, next) => {
  controller.getByRoom(req, res).catch(next);
});
