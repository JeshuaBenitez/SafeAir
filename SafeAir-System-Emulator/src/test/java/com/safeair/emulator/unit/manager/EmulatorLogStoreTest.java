package com.safeair.emulator.unit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import com.safeair.emulator.manager.EmulatorLogStore;

class EmulatorLogStoreTest {

    @Test
    void findByEmulator_returnsOnlyMatchingEntriesInOrder() {
        EmulatorLogStore store = new EmulatorLogStore();

        store.onEvent("EMU-1", "setup", "configured");
        store.onEvent("EMU-2", "setup", "configured");
        store.onEvent("EMU-1", "telemetry", "tick 1");

        assertEquals(3, store.findAllOrdered(10).size());
        assertEquals(2, store.findByEmulator("EMU-1", 10).size());
        assertEquals("configured", store.findByEmulator("EMU-1", 10).getFirst().message());
        assertEquals("tick 1", store.findByEmulator("EMU-1", 10).get(1).message());
    }
}
