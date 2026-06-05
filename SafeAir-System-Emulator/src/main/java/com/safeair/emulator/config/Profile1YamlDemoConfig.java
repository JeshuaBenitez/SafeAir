package com.safeair.emulator.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.EmulatorIdGenerator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorManager;

@Configuration
@Profile("profile1")
@EnableConfigurationProperties(Profile1EmulatorProperties.class)
public class Profile1YamlDemoConfig {

    @Bean
    public EmulatorManager emulatorManager(Request requestClient) {
        return new EmulatorManager(requestClient);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    public Profile1Lifecycle profile1Lifecycle(
            EmulatorManager emulatorManager,
            TelemetryQueue telemetryQueue,
            Profile1EmulatorProperties properties) {
        return new Profile1Lifecycle(emulatorManager, telemetryQueue, properties);
    }

    public static class Profile1Lifecycle {
        private final EmulatorManager emulatorManager;
        private final TelemetryQueue telemetryQueue;
        private final Profile1EmulatorProperties properties;
        private final List<String> emulatorIds = new ArrayList<>();

        public Profile1Lifecycle(
                EmulatorManager emulatorManager,
                TelemetryQueue telemetryQueue,
                Profile1EmulatorProperties properties) {
            this.emulatorManager = emulatorManager;
            this.telemetryQueue = telemetryQueue;
            this.properties = properties;
        }

        public void start() {
            List<Profile1EmulatorProperties.EmulatorDefinition> emulators = properties.getEmulators();
            if (emulators == null || emulators.isEmpty()) {
                throw new IllegalStateException("profile1 requires at least one emulator in safeair.profile1.emulators");
            }

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

                Emulator emulator = new Emulator(emulatorId, telemetryQueue);
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
    }
}
