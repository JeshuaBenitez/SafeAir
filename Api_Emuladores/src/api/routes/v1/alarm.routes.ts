import { Router } from "express";
import { AlarmController } from "../../controllers/alarm.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new AlarmController();
export const alarmRouter = Router();

alarmRouter.get("/rooms/:id/alarms", authMiddleware, (req, res, next) => {
  controller.list(req, res).catch(next);
});

alarmRouter.get("/rooms/:id/alarms/active", authMiddleware, (req, res, next) => {
  controller.active(req, res).catch(next);
});
