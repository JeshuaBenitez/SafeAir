package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.impl.AirExtractor;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T027 — CO2 dynamics: closed environment occupancy (+3ppm/tick) and extractor.
 */
class CO2SimulationTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
    private final DeterministicRandomStub zeroNoise = new DeterministicRandomStub(0.0);

    @Test
    void co2_closedEnvironment_occupancyAdds3PpmPerTick() {
        // windowCount=0 → closed environment
        Room closed = new Room(25, 0, 5, zeroNoise);
        closed.co2(420.0);
        closed.externalCo2(420.0); // no env delta so only occupancy +3 affects it

        double before = closed.co2();
        helper.simulateEnvironment(closed, null, null, null, zeroNoise);
        double after = closed.co2();

        // Expected: before + 3 (occupancy only, kEnv * (ext - int) = 0 when ext==int)
        assertEquals(before + 3.0, after, 0.1,
                "Closed room with no env delta should add exactly +3 ppm/tick");
    }

    @Test
    void co2_openEnvironment_noOccupancyBonus() {
        // windowCount=2 → not closed
        Room open = new Room(25, 2, 5, zeroNoise);
        open.co2(420.0);
        open.externalCo2(420.0); // no env delta

        double before = open.co2();
        helper.simulateEnvironment(open, null, null, null, zeroNoise);
        double after = open.co2();

        // With no env delta and no actuators, change should be ~0 (just noise which is 0)
        assertEquals(before, after, 0.5,
                "Open room with no env delta should not have occupancy bonus");
    }

    @Test
    void co2_extractor_reducesAboveExternal() {
        Room room = new Room(25, 2, 5, zeroNoise);
        room.co2(900.0);
        room.externalCo2(420.0);

        AirExtractor extractor = new AirExtractor();
        extractor.toggle(); // on

        double before = room.co2();
        helper.simulateEnvironment(room, null, null, extractor, zeroNoise);
        double after = room.co2();

        assertTrue(after < before, "Extractor should reduce CO2 when internal > external");
    }

    @Test
    void co2_neverBelowFloor() {
        Room room = new Room(25, 5, 5, zeroNoise);
        room.co2(DomainConstants.CO2_MIN);
        room.externalCo2(DomainConstants.CO2_MIN - 100); // pull down attempt

        for (int i = 0; i < 50; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.co2() >= DomainConstants.CO2_MIN,
                "CO2 must never drop below CO2_MIN = " + DomainConstants.CO2_MIN);
    }
}
