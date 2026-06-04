package com.safeair.emulator.unit.emulation.core;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DeviceState;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;

/**
 * T035 — Telemetry payload immutability and data integrity contracts.
 */
class TelemetryPayloadImmutabilityTest {

    private TelemetryPayload buildPayload() {
        RoomStateSnapshot snapshot = new RoomStateSnapshot(24.0, 45.0, 500.0, 10.0, 0.17, 25, 2);
        Map<String, Double> sensors = new HashMap<>();
        sensors.put("temperature", 24.0);
        sensors.put("humidity", 45.0);
        Map<String, DeviceState> devices = new HashMap<>();
        devices.put("miniSplit", new DeviceState(true, Map.of("setpoint", 24)));

        return new TelemetryPayload(
                Instant.now(),
                "EMU-0001",
                1000L,
                0,
                1,
                0L,
                snapshot,
                sensors,
                devices);
    }

    @Test
    void sensors_map_isUnmodifiable() {
        TelemetryPayload p = buildPayload();
        assertThrows(UnsupportedOperationException.class,
                () -> p.sensors().put("new", 99.0));
    }

    @Test
    void devices_map_isUnmodifiable() {
        TelemetryPayload p = buildPayload();
        assertThrows(UnsupportedOperationException.class,
                () -> p.devices().put("new", new DeviceState(false, Map.of())));
    }

    @Test
    void allFields_accessibleAndNonNull() {
        TelemetryPayload p = buildPayload();
        assertNotNull(p.timestamp());
        assertNotNull(p.emulatorId());
        assertNotNull(p.roomState());
        assertNotNull(p.sensors());
        assertNotNull(p.devices());
        assertTrue(p.tickDurationMs() >= 0);
        assertTrue(p.activeEmulatorCount() > 0);
    }

    @Test
    void nullSensors_treatedAsEmptyMap() {
        RoomStateSnapshot snapshot = new RoomStateSnapshot(24.0, 45.0, 500.0, 10.0, 0.17, 25, 2);
        TelemetryPayload p = new TelemetryPayload(
                Instant.now(), "EMU-0001", 0, 0, 1, 0L, snapshot, null, null);
        assertNotNull(p.sensors());
        assertTrue(p.sensors().isEmpty());
        assertNotNull(p.devices());
        assertTrue(p.devices().isEmpty());
    }
}
