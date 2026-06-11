package com.safeair.emulator.unit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.manager.EmulatorSnapshot;

class EmulatorManagerCliSupportTest {

    @Test
    void listSnapshots_exposesSortedAttributes() {
        EmulatorLogStore logStore = new EmulatorLogStore();
        EmulatorManager manager = new EmulatorManager(id -> new DtoSetup(id, 5, 20, 2, new int[]{1, 2}, new int[]{1}), null, logStore);

        TelemetryQueue queue = new TelemetryQueue(64);
        Emulator emulatorB = new Emulator("EMU-B", queue, logStore);
        emulatorB.applySetup(new DtoSetup("EMU-B", 3, 50, 1, new int[]{1, 4}, new int[]{1, 3}));
        Emulator emulatorA = new Emulator("EMU-A", queue, logStore);
        emulatorA.applySetup(new DtoSetup("EMU-A", 2, 35, 2, new int[]{2, 3}, new int[]{2}));

        manager.addEmulator(emulatorB);
        manager.addEmulator(emulatorA);

        EmulatorSnapshot first = manager.listSnapshots().getFirst();

        assertEquals("EMU-A", first.emulatorId());
        assertEquals(2, first.updateIntervalSec());
        assertEquals(35, first.roomSquareMeters());
        assertEquals(2, first.windowCount());
        assertEquals(2, first.sensors().size());
        assertEquals(1, first.devices().size());
    }
}
