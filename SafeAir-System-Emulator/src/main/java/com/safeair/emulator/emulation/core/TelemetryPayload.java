package com.safeair.emulator.emulation.core;

import java.time.Instant;
import java.util.Collections;
import java.util.Map;

public final class TelemetryPayload {
    private final Instant timestamp;
    private final String emulatorId;
    private final long tickDurationMs;
    private final int queueSize;
    private final int activeEmulatorCount;
    private final long droppedTelemetryCount;
    private final RoomStateSnapshot roomState;
    private final Map<String, Double> sensors;
    private final Map<String, DeviceState> devices;

    public TelemetryPayload(
            Instant timestamp,
            String emulatorId,
            long tickDurationMs,
            int queueSize,
            int activeEmulatorCount,
            long droppedTelemetryCount,
            RoomStateSnapshot roomState,
            Map<String, Double> sensors,
            Map<String, DeviceState> devices) {
        this.timestamp = timestamp;
        this.emulatorId = emulatorId;
        this.tickDurationMs = tickDurationMs;
        this.queueSize = queueSize;
        this.activeEmulatorCount = activeEmulatorCount;
        this.droppedTelemetryCount = droppedTelemetryCount;
        this.roomState = roomState;
        this.sensors = sensors == null ? Map.of() : Collections.unmodifiableMap(sensors);
        this.devices = devices == null ? Map.of() : Collections.unmodifiableMap(devices);
    }

    public Instant timestamp() { return timestamp; }
    public String emulatorId() { return emulatorId; }
    public long tickDurationMs() { return tickDurationMs; }
    public int queueSize() { return queueSize; }
    public int activeEmulatorCount() { return activeEmulatorCount; }
    public long droppedTelemetryCount() { return droppedTelemetryCount; }
    public RoomStateSnapshot roomState() { return roomState; }
    public Map<String, Double> sensors() { return sensors; }
    public Map<String, DeviceState> devices() { return devices; }

    @Override
    public String toString() {
        return "TelemetryPayload{"
                + "timestamp=" + timestamp
                + ", emulatorId=" + emulatorId
                + ", tickDurationMs=" + tickDurationMs
                + ", queueSize=" + queueSize
                + ", activeEmulatorCount=" + activeEmulatorCount
                + ", droppedTelemetryCount=" + droppedTelemetryCount
                + ", roomState=" + roomState
                + ", sensors=" + sensors
                + ", devices=" + devices
                + '}';
    }
}
