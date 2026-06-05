package com.safeair.emulator.unit.manager;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.TelemetryDispatcher;

/**
 * T037 — TelemetryDispatcher: forwards to channels, graceful stop.
 */
class TelemetryDispatcherTest {

    private TelemetryPayload makePayload() {
        RoomStateSnapshot snap = new RoomStateSnapshot(24, 45, 500, 10, 0.17, 25, 2);
        return new TelemetryPayload(Instant.now(), "EMU-0001", 0, 0, 1, 0, snap, null, null);
    }

    @Test
    void dispatcher_forwardsToAllChannels() throws InterruptedException {
        TelemetryQueue queue = new TelemetryQueue(16);
        AtomicInteger ch1Count = new AtomicInteger(0);
        AtomicInteger ch2Count = new AtomicInteger(0);

        SendInfo ch1 = new SendInfo() {
            @Override public void send(Object data) { ch1Count.incrementAndGet(); }
        };
        SendInfo ch2 = new SendInfo() {
            @Override public void send(Object data) { ch2Count.incrementAndGet(); }
        };

        TelemetryDispatcher dispatcher = new TelemetryDispatcher(queue, List.of(ch1, ch2));
        ExecutorService exec = Executors.newSingleThreadExecutor();
        exec.submit(dispatcher);

        queue.offer(makePayload());

        // Wait for dispatch
        Thread.sleep(500);
        dispatcher.stop();
        exec.shutdown();
        exec.awaitTermination(1, TimeUnit.SECONDS);

        assertEquals(1, ch1Count.get(), "Channel 1 should receive exactly 1 payload");
        assertEquals(1, ch2Count.get(), "Channel 2 should receive exactly 1 payload");
    }

    @Test
    void dispatcher_gracefulStop_evenWithEmptyQueue() throws InterruptedException {
        TelemetryQueue queue = new TelemetryQueue(16);
        TelemetryDispatcher dispatcher = new TelemetryDispatcher(queue, List.of());
        ExecutorService exec = Executors.newSingleThreadExecutor();
        exec.submit(dispatcher);

        Thread.sleep(200);
        dispatcher.stop();
        exec.shutdown();
        boolean terminated = exec.awaitTermination(2, TimeUnit.SECONDS);
        assertTrue(terminated, "Dispatcher should have stopped cleanly");
    }
}
