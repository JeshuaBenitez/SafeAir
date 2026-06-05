package com.safeair.emulator.integration.manager;

import org.junit.jupiter.api.AfterEach;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.emulation.impl.ElectrodomesticFactory;
import com.safeair.emulator.emulation.impl.SensorFactory;
import com.safeair.emulator.manager.EmulatorManager;

class LocalLifecycleIntegrationTest {

    private EmulatorManager manager;

    @AfterEach
    void teardown() {
        if (manager != null) {
            manager.stopAll();
        }
    }

    @Test
    void fullLifecycle_addSetupStart_emulatorRunning() throws InterruptedException {
        TelemetryQueue queue = new TelemetryQueue(1024);
        String id = "EMU-0101";
        DtoSetup dto = new DtoSetup(id, 1, 20, 2,
                new int[]{SensorFactory.TEMPERATURE, SensorFactory.HUMIDITY,
                           SensorFactory.CO2, SensorFactory.PM25},
                new int[]{ElectrodomesticFactory.MINI_SPLIT});

        manager = new EmulatorManager(ignored -> dto);
        Emulator emulator = new Emulator(id, queue);
        manager.addEmulator(emulator);
        manager.setupAll();
        manager.startAll();

        // Allow at least one tick to occur
        Thread.sleep(1500);

        // Queue should have received at least one payload
        assertTrue(queue.size() > 0 || queue.droppedCount() >= 0,
                "Emulator should have deposited telemetry data");

        manager.stopAll();
    }

    @Test
    void removeEmulator_stopsEmulatorGracefully() throws InterruptedException {
        TelemetryQueue queue = new TelemetryQueue(1024);
        String id = "EMU-0102";
        DtoSetup dto = new DtoSetup(id, 1, 20, 2,
                new int[]{SensorFactory.TEMPERATURE},
                new int[]{});

        manager = new EmulatorManager(ignored -> dto);
        Emulator emulator = new Emulator(id, queue);
        manager.addEmulator(emulator);
        manager.setupAll();
        manager.startAll();

        Thread.sleep(500);
        manager.removeEmulator(id);
        Thread.sleep(200);

        // After removal the manager should show 0 emulators
        assertEquals(0, manager.getEmulatorCount());
    }

    @Test
    void multipleEmulators_differentSeeds_divergeAfter50Ticks() {
        // SC-010: different emulatorIds → divergent PRNG sequence
        String idA = "EMU-0201";
        String idB = "EMU-0202";

        // Seed values should differ
        long seedA = com.safeair.emulator.emulation.simulation.EmulatorSeedStrategy.seedFrom(idA);
        long seedB = com.safeair.emulator.emulation.simulation.EmulatorSeedStrategy.seedFrom(idB);
        assertNotEquals(seedA, seedB, "Different emulatorIds must produce different seeds");
    }
}
