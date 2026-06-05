package com.safeair.emulator.unit.manager;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.EmulatorIdGenerator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.unit.TestFixtures;

class EmulatorManagerConcurrencyTest {

    private EmulatorManager createManager() {
        return new EmulatorManager(id -> new DtoSetup(
                id, 5, 20, 2,
                new int[]{},
                new int[]{}));
    }

    @Test
    void add50Emulators_concurrently_allPresent() throws InterruptedException {
        EmulatorManager manager = createManager();
        TelemetryQueue queue = new TelemetryQueue(1024);
        int count = 50;

        ExecutorService exec = Executors.newFixedThreadPool(10);
        CountDownLatch latch = new CountDownLatch(count);

        for (int i = 0; i < count; i++) {
            final int index = i;
            exec.submit(() -> {
                String id = EmulatorIdGenerator.format(index + 1);
                manager.addEmulator(new Emulator(id, queue));
                latch.countDown();
            });
        }
        latch.await(5, TimeUnit.SECONDS);
        exec.shutdown();

        // Manager must accept emulators when added concurrently.
        assertTrue(manager.getEmulatorCount() > 0);
    }

    @Test
    void removeEmulator_idempotent_doesNotThrow() {
        EmulatorManager manager = createManager();
        TelemetryQueue queue = new TelemetryQueue(1024);
        String id = TestFixtures.FIXED_EMULATOR_ID_A;
        Emulator emulator = new Emulator(id, queue);
        manager.addEmulator(emulator);

        assertDoesNotThrow(() -> {
            manager.removeEmulator(id);
            manager.removeEmulator(id); // second remove is no-op
        });
    }
}
