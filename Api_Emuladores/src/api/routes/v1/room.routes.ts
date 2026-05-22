import { Router } from "express";
import { RoomController } from "../../controllers/room.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { createDeviceSchema, createRoomSchema, updateRoomSchema, upsertRoomSetupSchema } from "../../dtos/room.dto";

const controller = new RoomController();
export const roomRouter = Router();

roomRouter.post("/", authMiddleware, validateBody(createRoomSchema), (req, res, next) => {
  controller.create(req, res).catch(next);
});

roomRouter.get("/:id", authMiddleware, (req, res, next) => {
  controller.getById(req, res).catch(next);
});

roomRouter.put("/:id", authMiddleware, validateBody(updateRoomSchema), (req, res, next) => {
  controller.update(req, res).catch(next);
});

roomRouter.get("/:id/setup", authMiddleware, (req, res, next) => {
  controller.getSetup(req, res).catch(next);
});

roomRouter.put("/:id/setup", authMiddleware, validateBody(upsertRoomSetupSchema), (req, res, next) => {
  controller.upsertSetup(req, res).catch(next);
});

roomRouter.get("/:id/devices", authMiddleware, (req, res, next) => {
  controller.listDevices(req, res).catch(next);
});

roomRouter.post("/:id/devices", authMiddleware, validateBody(createDeviceSchema), (req, res, next) => {
  controller.createDevice(req, res).catch(next);
});

roomRouter.get("/:id/actions/history", authMiddleware, (req, res, next) => {
  controller.actionHistory(req, res).catch(next);
});
