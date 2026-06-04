package com.safeair.emulator.emulation.core;

import java.util.concurrent.atomic.AtomicInteger;

public final class EmulatorIdGenerator {
    private static final AtomicInteger COUNTER = new AtomicInteger(0);

    private EmulatorIdGenerator() {}

    public static String next() {
        return format(COUNTER.incrementAndGet());
    }

    public static String format(int sequence) {
        return String.format("EMU-%04d", sequence);
    }
}
