import { Router } from "express";
import { InstanceController } from "../../controllers/instance.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createInstanceSchema } from "../../dtos/instance.dto";

const controller = new InstanceController();
export const instanceRouter = Router();

instanceRouter.post("/", authMiddleware, validateBody(createInstanceSchema), (req, res, next) => {
  controller.create(req, res).catch(next);
});

instanceRouter.get("/", authMiddleware, (req, res, next) => {
  controller.list(req, res).catch(next);
});

instanceRouter.get("/:id", authMiddleware, (req, res, next) => {
  controller.getById(req, res).catch(next);
});
