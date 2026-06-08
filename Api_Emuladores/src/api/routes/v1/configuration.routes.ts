import { Router } from "express";
import { ConfigurationController } from "../../controllers/configuration.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new ConfigurationController();
export const configurationRouter = Router();

configurationRouter.post("/rooms/:id/config/publish", authMiddleware, (req, res, next) => {
  controller.publish(req, res).catch(next);
});

configurationRouter.get("/rooms/:id/config", authMiddleware, (req, res, next) => {
  controller.getByRoom(req, res).catch(next);
});
