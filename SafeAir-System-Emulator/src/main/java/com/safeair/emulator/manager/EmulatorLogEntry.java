package com.safeair.emulator.manager;

import java.time.Instant;

public record EmulatorLogEntry(
        long sequence,
        Instant timestamp,
        String emulatorId,
        String category,
        String message) {
}
