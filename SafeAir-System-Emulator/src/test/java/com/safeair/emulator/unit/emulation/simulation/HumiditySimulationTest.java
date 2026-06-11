package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T026 — Humidity actuator effects and environmental convergence.
 */
class HumiditySimulationTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
    private final DeterministicRandomStub zeroNoise = new DeterministicRandomStub(0.0);

    private Room stdRoom() {
        Room r = new Room(25, 2, 5, zeroNoise);
        r.humidity(45.0);
        r.externalHumidity(55.0);
        return r;
    }

    @Test
    void humidity_deviceEffectStops_whenHumidifierOff() {
        Room room = stdRoom();
        room.humidity(30.0); // below target 50.0 so humidifier would push up if ON
        // With humidifier OFF, device effect does NOT apply.
        // Only environmental exchange applies (no noise with zeroNoise stub).
        double before = room.humidity();
        helper.simulateEnvironment(room, null, null, null, zeroNoise);
        double after = room.humidity();
        // Device effect (kHum * (50 - hum)) is 0 when humidifier is OFF
        // Only env exchange applies, but extHum=55, intHum=30 → deltaHEnv > 0
        assertTrue(after > before,
                "Humidity env exchange continues even when humidifier is OFF");
    }

    @Test
    void humidity_humidifierOn_levels5_pushesHumidityToward50() {
        Room room = stdRoom();
        room.humidity(30.0);
        HumidifierPurifier humidifier = new HumidifierPurifier();
        humidifier.toggle(); // turn on
        humidifier.setState(5);

        for (int i = 0; i < 40; i++) {
            helper.simulateEnvironment(room, null, humidifier, null, zeroNoise);
        }
        // Humidifier drives toward 50.0%, should be close
        assertEquals(50.0, room.humidity(), 5.0);
    }

    @Test
    void humidity_staysWithinBounds() {
        Room room = stdRoom();
        room.humidity(90.0);
        room.externalHumidity(90.0);
        for (int i = 0; i < 50; i++) {
            helper.simulateEnvironment(room, null, null, null, zeroNoise);
        }
        assertTrue(room.humidity() >= DomainConstants.HUMIDITY_MIN);
        assertTrue(room.humidity() <= DomainConstants.HUMIDITY_MAX);
    }
}
