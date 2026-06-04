package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Sensor;
import java.util.function.Supplier;

public class CO2Sensor extends Sensor {
    private final Supplier<Double> supplier;

    public CO2Sensor(Supplier<Double> supplier) {
        this.supplier = supplier;
    }

    @Override
    public double read() {
        return supplier.get();
    }
}
