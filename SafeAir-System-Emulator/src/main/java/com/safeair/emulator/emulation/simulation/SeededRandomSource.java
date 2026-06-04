package com.safeair.emulator.emulation.simulation;

import java.util.SplittableRandom;

public class SeededRandomSource implements RandomSource {
    private final SplittableRandom random;

    public SeededRandomSource(long seed) {
        this.random = new SplittableRandom(seed);
    }

    @Override
    public double nextDouble(double minInclusive, double maxInclusive) {
        return minInclusive + random.nextDouble() * (maxInclusive - minInclusive);
    }
}
