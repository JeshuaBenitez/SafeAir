import { Router } from "express";
import { AuthController } from "../../controllers/auth.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { loginSchema, registerSchema } from "../../dtos/auth.dto";

const controller = new AuthController();
export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), (req, res, next) => {
  controller.register(req, res).catch(next);
});

authRouter.post("/login", validateBody(loginSchema), (req, res, next) => {
  controller.login(req, res).catch(next);
});

authRouter.get("/me", authMiddleware, (req, res, next) => {
  controller.me(req, res).catch(next);
});
