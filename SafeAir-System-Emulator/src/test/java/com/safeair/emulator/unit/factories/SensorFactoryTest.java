package com.safeair.emulator.unit.factories;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.safeair.emulator.abstracts.Sensor;
import com.safeair.emulator.emulation.impl.SensorFactory;

class SensorFactoryTest {

    private final SensorFactory factory = new SensorFactory();

    @Test
    void createHumiditySensor_returnsReadableSensor() {
        Sensor s = factory.create(SensorFactory.HUMIDITY, () -> 55.0);
        assertEquals(55.0, s.read(), 1e-9);
    }

    @Test
    void createTemperatureSensor_returnsReadableSensor() {
        Sensor s = factory.create(SensorFactory.TEMPERATURE, () -> 22.5);
        assertEquals(22.5, s.read(), 1e-9);
    }

    @Test
    void createCO2Sensor_returnsReadableSensor() {
        Sensor s = factory.create(SensorFactory.CO2, () -> 800.0);
        assertEquals(800.0, s.read(), 1e-9);
    }

    @Test
    void createPM25Sensor_returnsReadableSensor() {
        Sensor s = factory.create(SensorFactory.PM25, () -> 12.5);
        assertEquals(12.5, s.read(), 1e-9);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 5, 99, -1})
    void createUnknownType_throwsIllegalArgument(int type) {
        assertThrows(IllegalArgumentException.class,
                () -> factory.create(type, () -> 0.0));
    }
}
