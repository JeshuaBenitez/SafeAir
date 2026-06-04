package com.safeair.emulator.emulation.core;

public final class DomainValidators {
    private DomainValidators() {}

    public static int validateMiniSplit(int value) {
        if (value < DomainConstants.MINI_SPLIT_MIN || value > DomainConstants.MINI_SPLIT_MAX) {
            throw new IllegalArgumentException("MiniSplit setpoint out of range");
        }
        return value;
    }

    public static int validateHumidifier(int value) {
        if (value < DomainConstants.HUMIDIFIER_MIN || value > DomainConstants.HUMIDIFIER_MAX) {
            throw new IllegalArgumentException("Humidifier level out of range");
        }
        return value;
    }

    public static int validateAirExtractor(int value) {
        if (value != DomainConstants.AIR_EXTRACTOR_OFF && value != DomainConstants.AIR_EXTRACTOR_ON) {
            throw new IllegalArgumentException("AirExtractor state out of range");
        }
        return value;
    }

    public static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
