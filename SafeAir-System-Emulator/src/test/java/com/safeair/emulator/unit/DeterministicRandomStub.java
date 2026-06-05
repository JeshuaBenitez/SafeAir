package com.safeair.emulator.unit;

import com.safeair.emulator.emulation.simulation.RandomSource;

public class DeterministicRandomStub implements RandomSource {
    private final double fixedValue;

    public DeterministicRandomStub(double fixedValue) {
        this.fixedValue = fixedValue;
    }

    @Override
    public double nextDouble(double min, double max) {
        return fixedValue;
    }
}
