package com.safeair.emulator.emulation.core;

public final class DomainConstants {
    private DomainConstants() {}

    public static final int MINI_SPLIT_MIN = 19;
    public static final int MINI_SPLIT_MAX = 30;
    public static final int HUMIDIFIER_MIN = 1;
    public static final int HUMIDIFIER_MAX = 5;
    public static final int AIR_EXTRACTOR_OFF = 0;
    public static final int AIR_EXTRACTOR_ON = 1;

    public static final double DISPERSION_MIN = 0.15;
    public static final double DISPERSION_MAX = 0.20;
    public static final double WINDOW_FACTOR_MULTIPLIER = 0.08;
    public static final double K_ENV_FLOOR = 0.01;

    public static final double TEMP_MIN = 15.0;
    public static final double TEMP_MAX = 40.0;
    public static final double HUMIDITY_MIN = 20.0;
    public static final double HUMIDITY_MAX = 90.0;
    public static final double CO2_MIN = 300.0;
    public static final double PM25_MIN = 0.0;

    public static final double TEMP_EPSILON = 0.3;
    public static final double HUMIDITY_EPSILON = 1.0;
    public static final double CO2_EPSILON = 10.0;
    public static final double PM25_EPSILON = 2.0;
    public static final int N_CONSECUTIVE = 5;

    public static final int TELEMETRY_QUEUE_CAPACITY = 1024;
    public static final int CONFIG_QUEUE_CAPACITY = 1024;
    public static final double TICK_TOLERANCE_RATIO = 0.10;
}
