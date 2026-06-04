package com.safeair.emulator.emulation.simulation;

import java.nio.charset.StandardCharsets;

public final class EmulatorSeedStrategy {
    private EmulatorSeedStrategy() {}

    public static long seedFrom(String emulatorId) {
        final long fnvOffsetBasis = 0xcbf29ce484222325L;
        final long fnvPrime = 0x100000001b3L;
        long hash = fnvOffsetBasis;

        for (byte b : emulatorId.getBytes(StandardCharsets.UTF_8)) {
            hash ^= (b & 0xff);
            hash *= fnvPrime;
        }

        return hash;
    }
}
