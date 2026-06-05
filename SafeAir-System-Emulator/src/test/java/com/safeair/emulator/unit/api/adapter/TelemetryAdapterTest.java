package com.safeair.emulator.unit.api.adapter;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.api.proto.TelemetryProto;
import com.safeair.emulator.emulation.core.DeviceState;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;

class TelemetryAdapterTest {

    @Test
    void toMessage_mapsTelemetryPayloadFields() {
        TelemetryPayload payload = new TelemetryPayload(
                Instant.ofEpochMilli(1710000000000L),
                "EMU-0001",
                120,
                11,
                3,
                2,
                new RoomStateSnapshot(24.0, 45.0, 501.0, 12.0, 0.17, 35, 2),
                Map.of("TemperatureSensor", 24.0),
                Map.of("MiniSplit", new DeviceState(true, Map.of("state", 24))));

        TelemetryAdapter adapter = new TelemetryAdapter();
        TelemetryProto.TelemetryMessage msg = adapter.toMessage(payload);

        assertEquals("EMU-0001", msg.getEmulatorId());
        assertEquals(120, msg.getTickDurationMs());
        assertEquals(11, msg.getQueueSize());
        assertEquals(3, msg.getActiveEmulatorCount());
        assertEquals(2, msg.getDroppedTelemetryCount());
        assertEquals(1, msg.getSensorsCount());
        assertEquals(1, msg.getDevicesCount());
        assertEquals(35, msg.getRoomState().getRoomSquareMeters());
        assertEquals(2, msg.getRoomState().getWindowCount());
    }

    @Test
    void toProtobuf_generatesNonEmptyBytes() {
        TelemetryPayload payload = new TelemetryPayload(
                Instant.now(),
                "EMU-0002",
                12,
                1,
                1,
                0,
                new RoomStateSnapshot(23.0, 41.0, 520.0, 9.0, 0.16, 20, 1),
                Map.of(),
                Map.of());

        TelemetryAdapter adapter = new TelemetryAdapter();
        byte[] bytes = adapter.toProtobuf(payload);

        assertTrue(bytes.length > 0);
    }
}
