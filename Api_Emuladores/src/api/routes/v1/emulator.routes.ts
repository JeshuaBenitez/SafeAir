import { Router } from "express";
import { EmulatorController } from "../../controllers/emulator.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const controller = new EmulatorController();
export const emulatorRouter = Router();

emulatorRouter.use(authMiddleware);

emulatorRouter.get("/", (req, res, next) => {
  controller.list(req, res).catch(next);
});

emulatorRouter.get("/free", (req, res, next) => {
  controller.free(req, res).catch(next);
});

emulatorRouter.get("/assigned", (req, res, next) => {
  controller.assigned(req, res).catch(next);
});

emulatorRouter.get("/:emulatorExternalId", (req, res, next) => {
  controller.get(req, res).catch(next);
});

emulatorRouter.post("/:emulatorExternalId/assign", (req, res, next) => {
  controller.assign(req, res).catch(next);
});

emulatorRouter.post("/:emulatorExternalId/release", (req, res, next) => {
  controller.release(req, res).catch(next);
});

emulatorRouter.post("/:emulatorExternalId/scenario", (req, res, next) => {
  controller.scenario(req, res).catch(next);
});

emulatorRouter.post("/:emulatorExternalId/config", (req, res, next) => {
  controller.config(req, res).catch(next);
});

emulatorRouter.post("/:emulatorExternalId/command", (req, res, next) => {
  controller.command(req, res).catch(next);
});
