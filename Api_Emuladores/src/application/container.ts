import { RoomSetupDomainService } from "../domain/services/room-setup-domain.service";
import { AlarmRepository } from "../infrastructure/repositories/alarm.repository";
import { ConfigurationRepository } from "../infrastructure/repositories/configuration.repository";
import { CycleRepository } from "../infrastructure/repositories/cycle.repository";
import { DeviceActionRepository } from "../infrastructure/repositories/device-action.repository";
import { DeviceStateRepository } from "../infrastructure/repositories/device-state.repository";
import { EmulatorRepository } from "../infrastructure/repositories/emulator.repository";
import { InstanceRepository } from "../infrastructure/repositories/instance.repository";
import { RoomRepository } from "../infrastructure/repositories/room.repository";
import { UserRepository } from "../infrastructure/repositories/user.repository";
import { AlarmService } from "./services/alarm.service";
import { AuthService } from "./services/auth.service";
import { ConfigurationService } from "./services/configuration.service";
import { CycleService } from "./services/cycle.service";
import { DeviceActionService } from "./services/device-action.service";
import { ActuatorStateIngestionService } from "./services/actuator-state-ingestion.service";
import { EmulatorResolutionService } from "./services/emulator-resolution.service";
import { InstanceService } from "./services/instance.service";
import { MetricsQueryService } from "./services/metrics-query.service";
import { RoomService } from "./services/room.service";
import { RuleEvaluationService } from "./services/rule-evaluation.service";
import { TelemetryIngestionService } from "./services/telemetry-ingestion.service";

const userRepository = new UserRepository();
const instanceRepository = new InstanceRepository();
const roomRepository = new RoomRepository();
const emulatorRepository = new EmulatorRepository();
const cycleRepository = new CycleRepository();
const deviceActionRepository = new DeviceActionRepository();
const deviceStateRepository = new DeviceStateRepository();
const alarmRepository = new AlarmRepository();
const configurationRepository = new ConfigurationRepository();
const roomSetupDomainService = new RoomSetupDomainService();

const authService = new AuthService(userRepository);
const instanceService = new InstanceService(instanceRepository);
const roomService = new RoomService(instanceRepository, roomRepository, roomSetupDomainService);
const emulatorResolutionService = new EmulatorResolutionService(emulatorRepository, instanceRepository, roomRepository);
const cycleService = new CycleService(cycleRepository);
const metricsQueryService = new MetricsQueryService(cycleRepository, deviceActionRepository, deviceStateRepository);
const ruleEvaluationService = new RuleEvaluationService();
const deviceActionService = new DeviceActionService(deviceActionRepository);
const actuatorStateIngestionService = new ActuatorStateIngestionService(emulatorResolutionService, deviceStateRepository);
const alarmService = new AlarmService(alarmRepository);
const configurationService = new ConfigurationService(configurationRepository, emulatorRepository);
const telemetryIngestionService = new TelemetryIngestionService(
  emulatorResolutionService,
  cycleRepository,
  ruleEvaluationService,
  deviceActionService,
  alarmService
);

export const container = {
  authService,
  instanceService,
  roomService,
  cycleService,
  metricsQueryService,
  deviceActionService,
  actuatorStateIngestionService,
  alarmService,
  configurationService,
  telemetryIngestionService
};
