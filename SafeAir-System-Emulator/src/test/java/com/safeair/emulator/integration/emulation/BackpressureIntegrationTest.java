package com.safeair.emulator.integration.emulation;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.emulation.core.TelemetryQueue;

/**
 * T038 — Backpressure integration: rapid producers → queue enforces drop-oldest.
 */
class BackpressureIntegrationTest {

    private TelemetryPayload makePayload(int i) {
        RoomStateSnapshot snap = new RoomStateSnapshot(24, 45, 500, 10, 0.17, 25, 2);
        return new TelemetryPayload(Instant.now(), String.format("EMU-%04d", i), i, 0, 1, 0, snap, null, null);
    }

    @Test
    void backpressure_queueNeverExceedsCapacity() throws InterruptedException {
        int capacity = 64;
        TelemetryQueue queue = new TelemetryQueue(capacity);
        int producerCount = 4;
        int messagesPerProducer = 200;

        ExecutorService producers = Executors.newFixedThreadPool(producerCount);
        CountDownLatch latch = new CountDownLatch(producerCount);

        for (int p = 0; p < producerCount; p++) {
            final int pid = p;
            producers.submit(() -> {
                for (int i = 0; i < messagesPerProducer; i++) {
                    queue.offer(makePayload(pid * 1000 + i));
                }
                latch.countDown();
            });
        }
        latch.await(5, TimeUnit.SECONDS);
        producers.shutdown();

        assertTrue(queue.size() <= capacity,
                "Queue must never exceed capacity under backpressure");
        long totalProduced = (long) producerCount * messagesPerProducer;
        assertEquals(totalProduced - queue.size(), queue.droppedCount(), queue.size(),
                "Dropped count + queue size should equal total produced (approx)");
    }
}
