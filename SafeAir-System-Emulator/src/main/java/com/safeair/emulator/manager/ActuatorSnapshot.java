package com.safeair.emulator.manager;

public record ActuatorSnapshot(
        String deviceType,
        int deviceIndex,
        boolean on,
        int state) {
}
