package com.safeair.emulator.unit.emulation.core;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.emulation.core.TelemetryQueue;

/**
 * T036 — SC-009: Queue capacity=1024, drop-oldest overflow, non-blocking producer.
 */
class TelemetryQueuePolicyTest {

    private TelemetryPayload makePayload(int i) {
        RoomStateSnapshot snap = new RoomStateSnapshot(24 + i, 45, 500, 10, 0.17, 25, 2);
        return new TelemetryPayload(Instant.now(), String.format("EMU-%04d", i), 0, 0, 1, 0, snap, null, null);
    }

    @Test
    void capacity_matches_domainConstant() {
        TelemetryQueue q = new TelemetryQueue(DomainConstants.TELEMETRY_QUEUE_CAPACITY);
        assertEquals(DomainConstants.TELEMETRY_QUEUE_CAPACITY, q.capacity());
        assertEquals(1024, q.capacity());
    }

    @Test
    void offer_doesNotBlock_underCapacity() {
        TelemetryQueue q = new TelemetryQueue(1024);
        long start = System.currentTimeMillis();
        for (int i = 0; i < 1024; i++) {
            q.offer(makePayload(i));
        }
        long duration = System.currentTimeMillis() - start;
        assertTrue(duration < 500, "offer() should be non-blocking (took " + duration + "ms)");
    }

    @Test
    void overflow_dropsOldest() throws InterruptedException {
        TelemetryQueue q = new TelemetryQueue(3);
        // Fill to capacity
        TelemetryPayload p1 = makePayload(1);
        TelemetryPayload p2 = makePayload(2);
        TelemetryPayload p3 = makePayload(3);
        q.offer(p1);
        q.offer(p2);
        q.offer(p3);
        // Overflow: oldest (p1) should be dropped
        TelemetryPayload p4 = makePayload(4);
        q.offer(p4);

        assertEquals(1, q.droppedCount());
        // Poll should get p2 (oldest remaining)
        TelemetryPayload polled = q.poll(100);
        assertSame(p2, polled, "After overflow, oldest item should have been dropped");
    }

    @Test
    void droppedCount_incrementsOnEachOverflow() {
        TelemetryQueue q = new TelemetryQueue(2);
        q.offer(makePayload(1));
        q.offer(makePayload(2));
        q.offer(makePayload(3)); // overflow → dropped=1
        q.offer(makePayload(4)); // overflow → dropped=2
        assertEquals(2, q.droppedCount());
    }

    @Test
    void poll_returnsNull_whenEmptyAfterTimeout() throws InterruptedException {
        TelemetryQueue q = new TelemetryQueue(1024);
        TelemetryPayload result = q.poll(50);
        assertNull(result);
    }

    @Test
    void size_tracksContents() {
        TelemetryQueue q = new TelemetryQueue(1024);
        assertEquals(0, q.size());
        q.offer(makePayload(1));
        assertEquals(1, q.size());
        q.offer(makePayload(2));
        assertEquals(2, q.size());
    }
}
