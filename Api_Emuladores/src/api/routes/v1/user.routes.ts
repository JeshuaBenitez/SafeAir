import { Router } from "express";
import { UserController } from "../../controllers/user.controller";
import { adminMiddleware } from "../../middlewares/admin.middleware";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new UserController();
export const userRouter = Router();

userRouter.use(authMiddleware, adminMiddleware);

userRouter.get("/", (req, res, next) => {
  controller.list(req, res).catch(next);
});

userRouter.post("/", (req, res, next) => {
  controller.create(req, res).catch(next);
});

userRouter.get("/:id", (req, res, next) => {
  controller.get(req, res).catch(next);
});

userRouter.patch("/:id", (req, res, next) => {
  controller.update(req, res).catch(next);
});

userRouter.patch("/:id/email", (req, res, next) => {
  controller.updateEmail(req, res).catch(next);
});

userRouter.patch("/:id/password", (req, res, next) => {
  controller.updatePassword(req, res).catch(next);
});

userRouter.patch("/:id/status", (req, res, next) => {
  controller.updateStatus(req, res).catch(next);
});
