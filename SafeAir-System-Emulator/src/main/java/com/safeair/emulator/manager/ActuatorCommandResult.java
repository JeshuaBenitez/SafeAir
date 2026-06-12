package com.safeair.emulator.manager;

public record ActuatorCommandResult(
        boolean success,
        String message,
        ActuatorSnapshot snapshot) {

    public static ActuatorCommandResult ok(ActuatorSnapshot snapshot) {
        return new ActuatorCommandResult(true, "ok", snapshot);
    }

    public static ActuatorCommandResult error(String message) {
        return new ActuatorCommandResult(false, message, null);
    }
}
