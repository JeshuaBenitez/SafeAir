package com.safeair.emulator.manager;

import java.util.List;

public record EmulatorSnapshot(
        String emulatorId,
        EmulatorLifecycleState state,
        int updateIntervalSec,
        int roomSquareMeters,
        int windowCount,
        long tickCount,
        int telemetryQueueSize,
        List<String> sensors,
        List<String> devices) {
}
