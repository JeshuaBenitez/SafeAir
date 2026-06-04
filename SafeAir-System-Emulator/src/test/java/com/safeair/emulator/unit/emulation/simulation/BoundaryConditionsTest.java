package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T029 — Boundary conditions: values clamp at minimum and maximum limits.
 */
class BoundaryConditionsTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
    private final DeterministicRandomStub zeroNoise = new DeterministicRandomStub(0.0);

    @Test
    void temperature_clampedAtMin() {
        Room room = new Room(25, 0, 5, zeroNoise);
        room.temperature(DomainConstants.TEMP_MIN);
        room.externalTemperature(DomainConstants.TEMP_MIN - 10);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.temperature() >= DomainConstants.TEMP_MIN);
    }

    @Test
    void temperature_clampedAtMax() {
        Room room = new Room(25, 5, 5, zeroNoise);
        room.temperature(DomainConstants.TEMP_MAX);
        room.externalTemperature(DomainConstants.TEMP_MAX + 10);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.temperature() <= DomainConstants.TEMP_MAX);
    }

    @Test
    void humidity_clampedAtMin() {
        Room room = new Room(25, 0, 5, zeroNoise);
        room.humidity(DomainConstants.HUMIDITY_MIN);
        room.externalHumidity(DomainConstants.HUMIDITY_MIN - 10);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.humidity() >= DomainConstants.HUMIDITY_MIN);
    }

    @Test
    void humidity_clampedAtMax() {
        Room room = new Room(25, 5, 5, zeroNoise);
        room.humidity(DomainConstants.HUMIDITY_MAX);
        room.externalHumidity(DomainConstants.HUMIDITY_MAX + 10);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.humidity() <= DomainConstants.HUMIDITY_MAX);
    }

    @Test
    void co2_neverBelowFloor() {
        Room room = new Room(25, 5, 5, zeroNoise);
        room.co2(DomainConstants.CO2_MIN);
        room.externalCo2(0.0);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.co2() >= DomainConstants.CO2_MIN);
    }

    @Test
    void pm25_neverNegative() {
        Room room = new Room(25, 5, 5, zeroNoise);
        room.pm25(0.0);
        room.externalPm25(-10.0);
        for (int i = 0; i < 20; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.pm25() >= DomainConstants.PM25_MIN);
    }
}
