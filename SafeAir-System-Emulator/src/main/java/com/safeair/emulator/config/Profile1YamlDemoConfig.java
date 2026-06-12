package com.safeair.emulator.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.ExecutorService;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Qualifier;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.EmulatorIdGenerator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.config.MqttProperties;
import org.springframework.core.env.Environment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@Profile("profile1")
@EnableConfigurationProperties({Profile1EmulatorProperties.class, EmulatorRuntimeProperties.class})
public class Profile1YamlDemoConfig {

    @Bean
    public EmulatorManager emulatorManager(
            Request requestClient,
            @Qualifier("emulatorManagerExecutor") ExecutorService emulatorManagerExecutor,
            EmulatorLogStore logStore) {
        return new EmulatorManager(requestClient, emulatorManagerExecutor, logStore);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    public Profile1Lifecycle profile1Lifecycle(
            EmulatorManager emulatorManager,
            TelemetryQueue telemetryQueue,
            Profile1EmulatorProperties properties,
            EmulatorRuntimeProperties runtimeProperties,
            MqttProperties mqttProperties,
            Environment environment,
            EmulatorLogStore logStore) {
        return new Profile1Lifecycle(
                emulatorManager,
                telemetryQueue,
                properties,
                runtimeProperties,
                mqttProperties,
                environment,
                logStore);
    }

    public static class Profile1Lifecycle {
        private static final Logger LOGGER = LoggerFactory.getLogger(Profile1Lifecycle.class);
        private final EmulatorManager emulatorManager;
        private final TelemetryQueue telemetryQueue;
        private final Profile1EmulatorProperties properties;
        private final EmulatorRuntimeProperties runtimeProperties;
        private final MqttProperties mqttProperties;
        private final Environment environment;
        private final EmulatorLogStore logStore;
        private final List<String> emulatorIds = new ArrayList<>();

        public Profile1Lifecycle(
                EmulatorManager emulatorManager,
                TelemetryQueue telemetryQueue,
                Profile1EmulatorProperties properties,
                EmulatorRuntimeProperties runtimeProperties,
                MqttProperties mqttProperties,
                Environment environment,
                EmulatorLogStore logStore) {
            this.emulatorManager = emulatorManager;
            this.telemetryQueue = telemetryQueue;
            this.properties = properties;
            this.runtimeProperties = runtimeProperties;
            this.mqttProperties = mqttProperties;
            this.environment = environment;
            this.logStore = logStore;
        }

        public void start() {
            List<Profile1EmulatorProperties.EmulatorDefinition> emulators = resolveEmulatorDefinitions();
            if (emulators == null || emulators.isEmpty()) {
                throw new IllegalStateException("profile1 requires at least one emulator in safeair.profile1.emulators");
            }

            logStartupSummary(emulators);

            for (Profile1EmulatorProperties.EmulatorDefinition definition : emulators) {
                String emulatorId = definition.getEmulatorId();
                if (emulatorId == null || emulatorId.isBlank()) {
                    emulatorId = EmulatorIdGenerator.next();
                }

                DtoSetup setup = new DtoSetup(
                        emulatorId,
                        definition.getUpdateIntervalSec(),
                        definition.getRoomSquareMeters(),
                        definition.getWindowCount(),
                        toIntArray(definition.getSensorTypes()),
                        toIntArray(definition.getDeviceTypes()));

                Emulator emulator = new Emulator(emulatorId, telemetryQueue, logStore);
                emulator.applySetup(setup);
                emulatorManager.addEmulator(emulator);
                emulatorIds.add(emulatorId);
            }

            emulatorManager.startAll();
        }

        public void stop() {
            emulatorManager.stopAll();
            for (String emulatorId : emulatorIds) {
                emulatorManager.removeEmulator(emulatorId);
            }
            emulatorIds.clear();
        }

        private static int[] toIntArray(List<Integer> values) {
            if (values == null || values.isEmpty()) {
                return new int[0];
            }
            int[] result = new int[values.size()];
            for (int i = 0; i < values.size(); i++) {
                result[i] = values.get(i);
            }
            return result;
        }

        private List<Profile1EmulatorProperties.EmulatorDefinition> resolveEmulatorDefinitions() {
            List<String> explicitIds = parseIds(runtimeProperties.getIds());
            if (!explicitIds.isEmpty()) {
                LOGGER.info("Using SAFEAIR_EMULATOR_IDS with {} configured emulator(s)", explicitIds.size());
                return definitionsForIds(explicitIds);
            }

            if (hasLegacyEmulatorIdEnv()) {
                LOGGER.info("Using SAFEAIR_EMULATOR_ID_1..3 compatibility variables");
            } else {
                LOGGER.warn("No SAFEAIR_EMULATOR_IDS or SAFEAIR_EMULATOR_ID_1..3 provided; using documented local demo IDs only");
            }

            return properties.getEmulators();
        }

        private List<Profile1EmulatorProperties.EmulatorDefinition> definitionsForIds(List<String> ids) {
            List<Profile1EmulatorProperties.EmulatorDefinition> templates = properties.getEmulators();
            List<Profile1EmulatorProperties.EmulatorDefinition> resolved = new ArrayList<>();
            for (int index = 0; index < ids.size(); index += 1) {
                Profile1EmulatorProperties.EmulatorDefinition template = templateAt(templates, index);
                Profile1EmulatorProperties.EmulatorDefinition definition = new Profile1EmulatorProperties.EmulatorDefinition();
                definition.setEmulatorId(ids.get(index));
                definition.setUpdateIntervalSec(template.getUpdateIntervalSec());
                definition.setRoomSquareMeters(template.getRoomSquareMeters());
                definition.setWindowCount(template.getWindowCount());
                definition.setSensorTypes(new ArrayList<>(template.getSensorTypes()));
                definition.setDeviceTypes(new ArrayList<>(template.getDeviceTypes()));
                resolved.add(definition);
            }
            return resolved;
        }

        private Profile1EmulatorProperties.EmulatorDefinition templateAt(
                List<Profile1EmulatorProperties.EmulatorDefinition> templates,
                int index) {
            if (templates != null && !templates.isEmpty()) {
                return templates.get(index % templates.size());
            }

            Profile1EmulatorProperties.EmulatorDefinition fallback = new Profile1EmulatorProperties.EmulatorDefinition();
            fallback.setSensorTypes(List.of(1, 2, 3, 4));
            fallback.setDeviceTypes(List.of(1, 2, 3));
            return fallback;
        }

        private List<String> parseIds(String rawIds) {
            if (rawIds == null || rawIds.isBlank()) {
                return List.of();
            }

            return List.of(rawIds.split(",")).stream()
                    .map(String::trim)
                    .filter(value -> !value.isBlank())
                    .distinct()
                    .toList();
        }

        private boolean hasLegacyEmulatorIdEnv() {
            return List.of("SAFEAIR_EMULATOR_ID_1", "SAFEAIR_EMULATOR_ID_2", "SAFEAIR_EMULATOR_ID_3").stream()
                    .map(System::getenv)
                    .filter(Objects::nonNull)
                    .anyMatch(value -> !value.isBlank());
        }

        private void logStartupSummary(List<Profile1EmulatorProperties.EmulatorDefinition> emulators) {
            LOGGER.info("Active profiles: {}", String.join(",", environment.getActiveProfiles()));
            LOGGER.info("MQTT host: {}", mqttProperties.getHost());
            LOGGER.info("MQTT port: {}", mqttProperties.getPort());
            LOGGER.info("MQTT TLS: {}", mqttProperties.getTls().isEnabled());
            LOGGER.info("Telemetry publisher: MQTT {}", mqttProperties.isEnabled() ? "enabled" : "disabled");
            LOGGER.info("Console log publisher: {}", mqttProperties.isConsoleLogEnabled() ? "enabled" : "disabled");
            LOGGER.info("Configured emulator IDs:");
            for (Profile1EmulatorProperties.EmulatorDefinition emulator : emulators) {
                LOGGER.info("- {}", emulator.getEmulatorId());
            }
        }
    }
}
