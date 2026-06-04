package com.safeair.emulator.emulation.simulation;

import com.safeair.emulator.emulation.core.DomainConstants;

public class Room {
    private final int roomSquareMeters;
    private final int windowCount;
    private final int updateIntervalSec;
    private final double dispersionRate;

    private double temperature = 24.0;
    private double humidity = 45.0;
    private double co2 = 500.0;
    private double pm25 = 10.0;

    private double externalTemperature = 28.0;
    private double externalHumidity = 55.0;
    private double externalCo2 = 420.0;
    private double externalPm25 = 12.0;

    public Room(int roomSquareMeters, int windowCount, int updateIntervalSec, RandomSource randomSource) {
        this.roomSquareMeters = roomSquareMeters;
        this.windowCount = windowCount;
        this.updateIntervalSec = updateIntervalSec;
        this.dispersionRate = randomSource.nextDouble(DomainConstants.DISPERSION_MIN, DomainConstants.DISPERSION_MAX);
    }

    public int roomSquareMeters() { return roomSquareMeters; }
    public int windowCount() { return windowCount; }
    public int updateIntervalSec() { return updateIntervalSec; }
    public double dispersionRate() { return dispersionRate; }

    public double temperature() { return temperature; }
    public void temperature(double value) { this.temperature = value; }
    public double humidity() { return humidity; }
    public void humidity(double value) { this.humidity = value; }
    public double co2() { return co2; }
    public void co2(double value) { this.co2 = value; }
    public double pm25() { return pm25; }
    public void pm25(double value) { this.pm25 = value; }

    public double externalTemperature() { return externalTemperature; }
    public void externalTemperature(double value) { this.externalTemperature = value; }
    public double externalHumidity() { return externalHumidity; }
    public void externalHumidity(double value) { this.externalHumidity = value; }
    public double externalCo2() { return externalCo2; }
    public void externalCo2(double value) { this.externalCo2 = value; }
    public double externalPm25() { return externalPm25; }
    public void externalPm25(double value) { this.externalPm25 = value; }

    public boolean closedEnvironment() {
        return windowCount == 0;
    }
}
