package com.safeair.emulator.integration.mqtt;

import java.time.Instant;
import java.util.Map;

import com.safeair.emulator.api.dto.ConfigCommand;

final class MqttTestSupport {
    private MqttTestSupport() {}

    @SuppressWarnings("unused")
    static ConfigCommand globalCommand() {
        return new ConfigCommand(
                "cmd-global",
                ConfigCommand.Scope.GLOBAL,
                null,
                Instant.now(),
                1L,
                Map.of("minisplitState", "24"));
    }

    @SuppressWarnings("unused")
    static ConfigCommand specificCommand(String emulatorId) {
        return new ConfigCommand(
                "cmd-specific",
                ConfigCommand.Scope.EMULATOR,
                emulatorId,
                Instant.now(),
                2L,
                Map.of("humidifierState", "3"));
    }
}
