package com.safeair.emulator.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.EmulatorIdGenerator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorManager;

@Configuration
@Profile("local-demo & !profile1")
public class LocalDemoProfileConfig {

    @Bean
    public EmulatorManager emulatorManager(Request requestClient) {
        return new EmulatorManager(requestClient);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    public DemoLifecycle demoLifecycle(EmulatorManager emulatorManager, TelemetryQueue telemetryQueue) {
        return new DemoLifecycle(emulatorManager, telemetryQueue);
    }

    public static class DemoLifecycle {
        private final EmulatorManager emulatorManager;
        private final TelemetryQueue telemetryQueue;
        private String emulatorId;

        public DemoLifecycle(EmulatorManager emulatorManager, TelemetryQueue telemetryQueue) {
            this.emulatorManager = emulatorManager;
            this.telemetryQueue = telemetryQueue;
        }

        public void start() {
            emulatorId = EmulatorIdGenerator.next();
            Emulator emulator = new Emulator(emulatorId, telemetryQueue);
            emulatorManager.addEmulator(emulator);
            emulatorManager.setup(emulatorId);
            emulatorManager.startAll();
        }

        public void stop() {
            emulatorManager.stopAll();
            if (emulatorId != null) {
                emulatorManager.removeEmulator(emulatorId);
            }
        }
    }
}
