import { sequelize } from "../sequelize";
import { ApiRequestLogModel, initApiRequestLogModel } from "./api-request-log.model";
import { AlarmModel, initAlarmModel } from "./alarm.model";
import { CycleMeasurementModel, initCycleMeasurementModel } from "./cycle-measurement.model";
import { CycleModel, initCycleModel } from "./cycle.model";
import { DeviceActionModel, initDeviceActionModel } from "./device-action.model";
import { DeviceStateModel, initDeviceStateModel } from "./device-state.model";
import { DeviceModel, initDeviceModel } from "./device.model";
import { EmulatorModel, initEmulatorModel } from "./emulator.model";
import { InstanceModel, initInstanceModel } from "./instance.model";
import { RoomSetupDerivedModel, initRoomSetupDerivedModel } from "./room-setup-derived.model";
import { RoomSetupModel, initRoomSetupModel } from "./room-setup.model";
import { RoomModel, initRoomModel } from "./room.model";
import { UserModel, initUserModel } from "./user.model";

let initialized = false;

function initModels(): void {
  if (initialized) {
    return;
  }

  initUserModel(sequelize);
  initApiRequestLogModel(sequelize);
  initInstanceModel(sequelize);
  initRoomModel(sequelize);
  initRoomSetupModel(sequelize);
  initRoomSetupDerivedModel(sequelize);
  initDeviceModel(sequelize);
  initEmulatorModel(sequelize);
  initCycleModel(sequelize);
  initCycleMeasurementModel(sequelize);
  initDeviceActionModel(sequelize);
  initDeviceStateModel(sequelize);
  initAlarmModel(sequelize);

  initialized = true;
}

export function initModelAssociations(): void {
  initModels();

  InstanceModel.hasMany(RoomModel, { foreignKey: "instanceId", as: "rooms" });
  RoomModel.belongsTo(InstanceModel, { foreignKey: "instanceId", as: "instance" });

  RoomModel.hasOne(RoomSetupModel, { foreignKey: "roomId", as: "setup" });
  RoomSetupModel.belongsTo(RoomModel, { foreignKey: "roomId", as: "room" });

  RoomModel.hasOne(RoomSetupDerivedModel, { foreignKey: "roomId", as: "derivedSetup" });
  RoomSetupDerivedModel.belongsTo(RoomModel, { foreignKey: "roomId", as: "room" });

  RoomModel.hasMany(DeviceModel, { foreignKey: "roomId", as: "devices" });
  DeviceModel.belongsTo(RoomModel, { foreignKey: "roomId", as: "room" });

  RoomModel.hasOne(EmulatorModel, { foreignKey: "roomId", as: "emulator" });
  EmulatorModel.belongsTo(RoomModel, { foreignKey: "roomId", as: "room" });

  RoomModel.hasMany(CycleModel, { foreignKey: "roomId", as: "cycles" });
  CycleModel.belongsTo(RoomModel, { foreignKey: "roomId", as: "room" });

  CycleModel.hasMany(CycleMeasurementModel, { foreignKey: "cycleId", as: "measurements" });
  CycleMeasurementModel.belongsTo(CycleModel, { foreignKey: "cycleId", as: "cycle" });

  CycleModel.hasMany(DeviceActionModel, { foreignKey: "cycleId", as: "actions" });
  DeviceActionModel.belongsTo(CycleModel, { foreignKey: "cycleId", as: "cycle" });

  CycleModel.hasMany(AlarmModel, { foreignKey: "cycleId", as: "alarms" });
  AlarmModel.belongsTo(CycleModel, { foreignKey: "cycleId", as: "cycle" });

  RoomModel.hasMany(CycleMeasurementModel, { foreignKey: "roomId", as: "measurements" });
  RoomModel.hasMany(DeviceActionModel, { foreignKey: "roomId", as: "actions" });
  RoomModel.hasMany(AlarmModel, { foreignKey: "roomId", as: "alarms" });
}

export {
  ApiRequestLogModel,
  UserModel,
  InstanceModel,
  RoomModel,
  RoomSetupModel,
  RoomSetupDerivedModel,
  DeviceModel,
  EmulatorModel,
  CycleModel,
  CycleMeasurementModel,
  DeviceActionModel,
  DeviceStateModel,
  AlarmModel
};

