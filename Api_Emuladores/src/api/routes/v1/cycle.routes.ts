import { Router } from "express";
import { CycleController } from "../../controllers/cycle.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new CycleController();
export const cycleRouter = Router();

cycleRouter.post("/rooms/:id/cycles/start", authMiddleware, (req, res, next) => {
  controller.start(req, res).catch(next);
});

cycleRouter.post("/rooms/:id/cycles/close", authMiddleware, (req, res, next) => {
  controller.close(req, res).catch(next);
});

cycleRouter.get("/rooms/:id/cycles", authMiddleware, (req, res, next) => {
  controller.list(req, res).catch(next);
});
