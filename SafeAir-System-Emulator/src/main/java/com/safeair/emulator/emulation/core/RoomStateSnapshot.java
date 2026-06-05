package com.safeair.emulator.emulation.core;

public final class RoomStateSnapshot {
    private final double temperature;
    private final double humidity;
    private final double co2;
    private final double pm25;
    private final double dispersionRate;
    private final int area;
    private final int windows;

    public RoomStateSnapshot(double temperature, double humidity, double co2, double pm25, double dispersionRate, int area, int windows) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.co2 = co2;
        this.pm25 = pm25;
        this.dispersionRate = dispersionRate;
        this.area = area;
        this.windows = windows;
    }

    public double temperature() { return temperature; }
    public double humidity() { return humidity; }
    public double co2() { return co2; }
    public double pm25() { return pm25; }
    public double dispersionRate() { return dispersionRate; }
    public int area() { return area; }
    public int windows() { return windows; }

    @Override
    public String toString() {
        return "RoomStateSnapshot{"
                + "temperature=" + temperature
                + ", humidity=" + humidity
                + ", co2=" + co2
                + ", pm25=" + pm25
                + ", dispersionRate=" + dispersionRate
                + ", area=" + area
                + ", windows=" + windows
                + '}';
    }
}
