package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;

public class ElectrodomesticFactory {
    public static final int MINI_SPLIT = 1;
    public static final int HUMIDIFIER_PURIFIER = 2;
    public static final int AIR_EXTRACTOR = 3;

    public Electrodomestic create(int type) {
        return switch (type) {
            case MINI_SPLIT -> new MiniSplit();
            case HUMIDIFIER_PURIFIER -> new HumidifierPurifier();
            case AIR_EXTRACTOR -> new AirExtractor();
            default -> throw new IllegalArgumentException("Unknown device type: " + type);
        };
    }
}
