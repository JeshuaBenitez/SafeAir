import { Router } from "express";
import { alarmRouter } from "./alarm.routes";
import { authRouter } from "./auth.routes";
import { configurationRouter } from "./configuration.routes";
import { cycleRouter } from "./cycle.routes";
import { instanceRouter } from "./instance.routes";
import { metricsRouter } from "./metrics.routes";
import { roomRouter } from "./room.routes";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/instances", instanceRouter);
v1Router.use("/rooms", roomRouter);
v1Router.use(metricsRouter);
v1Router.use(cycleRouter);
v1Router.use(alarmRouter);
v1Router.use(configurationRouter);
