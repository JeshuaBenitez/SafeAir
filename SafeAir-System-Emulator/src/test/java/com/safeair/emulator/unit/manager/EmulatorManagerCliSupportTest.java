package com.safeair.emulator.unit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.ActuatorCommandResult;
import com.safeair.emulator.manager.ActuatorSnapshot;
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

    @Test
    void listActuators_exposesIndexedDeviceState() {
        EmulatorManager manager = new EmulatorManager(id -> new DtoSetup(id, 5, 20, 2, new int[]{1, 2}, new int[]{1}));
        Emulator emulator = new Emulator("EMU-A", new TelemetryQueue(64));
        emulator.applySetup(new DtoSetup("EMU-A", 2, 35, 2, new int[]{2, 3}, new int[]{1, 2, 3}));
        manager.addEmulator(emulator);

        ActuatorSnapshot first = manager.listActuators("EMU-A").getFirst();

        assertEquals("minisplit", first.deviceType());
        assertEquals(1, first.deviceIndex());
        assertFalse(first.on());
        assertEquals(24, first.state());
    }

    @Test
    void applyActuatorCommand_controlsSupportedDevicesOnly() {
        EmulatorManager manager = new EmulatorManager(id -> new DtoSetup(id, 5, 20, 2, new int[]{1, 2}, new int[]{1}));
        Emulator emulator = new Emulator("EMU-A", new TelemetryQueue(64));
        emulator.applySetup(new DtoSetup("EMU-A", 2, 35, 2, new int[]{2, 3}, new int[]{1, 2, 3}));
        manager.addEmulator(emulator);

        ActuatorCommandResult setpoint = manager.applyActuatorCommand("EMU-A", "minisplit", 1, "set_temperature", 22);
        ActuatorCommandResult turnOn = manager.applyActuatorCommand("EMU-A", "minisplit", 1, "turn_on", null);
        ActuatorCommandResult level = manager.applyActuatorCommand("EMU-A", "purifier", 1, "set_level", 5);
        ActuatorCommandResult extractor = manager.applyActuatorCommand("EMU-A", "extractor", 1, "set_state", 1);
        ActuatorCommandResult invalid = manager.applyActuatorCommand("EMU-A", "purifier", 1, "set_level", 8);

        assertTrue(setpoint.success());
        assertFalse(setpoint.snapshot().on());
        assertEquals(22, setpoint.snapshot().state());
        assertTrue(turnOn.snapshot().on());
        assertTrue(level.success());
        assertFalse(level.snapshot().on());
        assertEquals(5, level.snapshot().state());
        assertTrue(extractor.snapshot().on());
        assertEquals(1, extractor.snapshot().state());
        assertFalse(invalid.success());
        assertEquals("value_out_of_range", invalid.message());
    }

    @Test
    void applyActuatorCommand_reportsMissingEmulatorAndDevice() {
        EmulatorManager manager = new EmulatorManager(id -> new DtoSetup(id, 5, 20, 2, new int[]{1, 2}, new int[]{1}));
        Emulator emulator = new Emulator("EMU-A", new TelemetryQueue(64));
        emulator.applySetup(new DtoSetup("EMU-A", 2, 35, 2, new int[]{2, 3}, new int[]{1}));
        manager.addEmulator(emulator);

        ActuatorCommandResult missingEmulator = manager.applyActuatorCommand("EMU-Z", "minisplit", 1, "turn_on", null);
        ActuatorCommandResult missingDevice = manager.applyActuatorCommand("EMU-A", "extractor", 1, "turn_on", null);

        assertFalse(missingEmulator.success());
        assertEquals("emulator_not_found", missingEmulator.message());
        assertFalse(missingDevice.success());
        assertEquals("device_not_found", missingDevice.message());
    }
}
