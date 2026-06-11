package com.safeair.emulator.manager;

@FunctionalInterface
public interface EmulatorEventListener {
    EmulatorEventListener NO_OP = (emulatorId, category, message) -> { };

    void onEvent(String emulatorId, String category, String message);
}
