package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.impl.MiniSplit;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T025 — Temperature actuator effects and environmental convergence.
 */
class TemperatureSimulationTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
    private final DeterministicRandomStub zeroNoise = new DeterministicRandomStub(0.0);

    private Room stdRoom(double internalTemp) {
        Room r = new Room(25, 2, 5, zeroNoise);
        r.temperature(internalTemp);
        r.externalTemperature(28.0);
        return r;
    }

    @Test
    void temperature_frozen_whenMiniSplitOff() {
        Room room = stdRoom(24.0);
        // With no miniSplit, temperature must freeze completely.
        double before = room.temperature();
        for (int i = 0; i < 10; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        double after = room.temperature();
        assertEquals(before, after, 1e-10,
                "Temperature must stay frozen when miniSplit is OFF");
    }

    @Test
    void temperature_miniSplitOn_targetsSetpoint() {
        Room room = stdRoom(20.0);
        MiniSplit ac = new MiniSplit();
        ac.toggle(); // turns on
        ac.setState(24); // setpoint 24

        // Run several ticks
        for (int i = 0; i < 30; i++) {
            helper.simulateEnvironment(room, ac, null, null, zeroNoise);
        }
        // After 30 ticks with zero noise toward setpoint, temperature should be close
        assertEquals(24.0, room.temperature(), 2.0,
                "MiniSplit should drive temperature toward setpoint");
    }

    @Test
    void temperature_staysWithinBounds() {
        Room room = stdRoom(15.0);
        room.externalTemperature(15.0);
        for (int i = 0; i < 100; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.temperature() >= DomainConstants.TEMP_MIN);
        assertTrue(room.temperature() <= DomainConstants.TEMP_MAX);
    }
}
