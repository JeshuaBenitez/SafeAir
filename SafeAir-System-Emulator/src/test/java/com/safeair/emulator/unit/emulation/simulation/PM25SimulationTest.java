package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T028 — PM2.5 dynamics and purifier filter effect.
 */
class PM25SimulationTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
    private final DeterministicRandomStub zeroNoise = new DeterministicRandomStub(0.0);

    @Test
    void pm25_movesTowardExternal_withNoActuator() {
        Room room = new Room(25, 2, 5, zeroNoise);
        room.pm25(20.0);
        room.externalPm25(5.0); // pull down

        double before = room.pm25();
        helper.simulateEnvironment(room, null, null, null, zeroNoise);
        double after = room.pm25();

        assertTrue(after < before, "PM25 should move toward lower external value");
    }

    @Test
    void pm25_purifierOn_reducesConcentration() {
        Room room = new Room(25, 2, 5, zeroNoise);
        room.pm25(50.0);
        room.externalPm25(50.0); // no env delta — only purifier effect

        HumidifierPurifier purifier = new HumidifierPurifier();
        purifier.toggle();
        purifier.setState(5); // max level

        double before = room.pm25();
        helper.simulateEnvironment(room, null, purifier, null, zeroNoise);
        double after = room.pm25();

        assertTrue(after < before, "Purifier should reduce PM25");
    }

    @Test
    void pm25_neverNegative() {
        Room room = new Room(25, 2, 5, zeroNoise);
        room.pm25(DomainConstants.PM25_MIN);
        room.externalPm25(0.0);

        HumidifierPurifier purifier = new HumidifierPurifier();
        purifier.toggle();
        purifier.setState(5);

        for (int i = 0; i < 100; i++) {
            helper.simulateEnvironment(room, null, purifier, null, zeroNoise);
        }
        assertTrue(room.pm25() >= DomainConstants.PM25_MIN,
                "PM25 must never be negative");
    }
}
