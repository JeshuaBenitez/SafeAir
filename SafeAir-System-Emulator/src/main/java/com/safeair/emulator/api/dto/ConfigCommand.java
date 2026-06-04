package com.safeair.emulator.api.dto;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

public final class ConfigCommand {
    public enum Scope {
        GLOBAL,
        EMULATOR
    }

    private final String commandId;
    private final Scope scope;
    private final String targetEmulatorId;
    private final Instant receivedAtUtc;
    private final long sequence;
    private final Map<String, String> payload;

    public ConfigCommand(
            String commandId,
            Scope scope,
            String targetEmulatorId,
            Instant receivedAtUtc,
            long sequence,
            Map<String, String> payload) {
        this.commandId = commandId == null || commandId.isBlank() ? UUID.randomUUID().toString() : commandId;
        this.scope = scope;
        this.targetEmulatorId = targetEmulatorId;
        this.receivedAtUtc = receivedAtUtc == null ? Instant.now() : receivedAtUtc;
        this.sequence = sequence;
        this.payload = payload == null ? Map.of() : Collections.unmodifiableMap(payload);

        if (scope == Scope.EMULATOR && (targetEmulatorId == null || targetEmulatorId.isBlank())) {
            throw new IllegalArgumentException("targetEmulatorId is required for EMULATOR scope");
        }
    }

    public String commandId() {
        return commandId;
    }

    public Scope scope() {
        return scope;
    }

    public String targetEmulatorId() {
        return targetEmulatorId;
    }

    public Instant receivedAtUtc() {
        return receivedAtUtc;
    }

    public long sequence() {
        return sequence;
    }

    public Map<String, String> payload() {
        return payload;
    }

    public boolean isGlobal() {
        return scope == Scope.GLOBAL;
    }

    public boolean isSpecific() {
        return scope == Scope.EMULATOR;
    }
}
