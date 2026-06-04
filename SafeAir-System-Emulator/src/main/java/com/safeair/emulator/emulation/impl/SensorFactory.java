package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Sensor;
import java.util.function.Supplier;

public class SensorFactory {
    public static final int HUMIDITY = 1;
    public static final int TEMPERATURE = 2;
    public static final int PM25 = 3;
    public static final int CO2 = 4;

    public Sensor create(int type, Supplier<Double> supplier) {
        return switch (type) {
            case HUMIDITY -> new HumiditySensor(supplier);
            case TEMPERATURE -> new TemperatureSensor(supplier);
            case PM25 -> new PM25Sensor(supplier);
            case CO2 -> new CO2Sensor(supplier);
            default -> throw new IllegalArgumentException("Unknown sensor type: " + type);
        };
    }
}
