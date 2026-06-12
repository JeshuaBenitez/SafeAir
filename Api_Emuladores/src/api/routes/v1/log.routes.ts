import { Router } from "express";
import { LogController } from "../../controllers/log.controller";
import { adminMiddleware } from "../../middlewares/admin.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new LogController();
export const logRouter = Router();

logRouter.get("/logs", authMiddleware, adminMiddleware, (req, res, next) => {
  controller.list(req, res).catch(next);
});
