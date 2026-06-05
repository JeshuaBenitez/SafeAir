package com.safeair.emulator.emulation.simulation;

public interface RandomSource {
    double nextDouble(double minInclusive, double maxInclusive);
}
