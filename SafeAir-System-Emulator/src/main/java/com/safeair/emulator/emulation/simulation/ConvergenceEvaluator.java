package com.safeair.emulator.emulation.simulation;

import com.safeair.emulator.emulation.core.DomainConstants;

public class ConvergenceEvaluator {
    private int tempConsecutive;
    private int humidityConsecutive;
    private int co2Consecutive;
    private int pm25Consecutive;

    public void update(Room room, double tempTarget, double humidityTarget, double co2Target, double pm25Target) {
        tempConsecutive = updateCounter(room.temperature(), tempTarget, DomainConstants.TEMP_EPSILON, tempConsecutive);
        humidityConsecutive = updateCounter(room.humidity(), humidityTarget, DomainConstants.HUMIDITY_EPSILON, humidityConsecutive);
        co2Consecutive = updateCounter(room.co2(), co2Target, DomainConstants.CO2_EPSILON, co2Consecutive);
        pm25Consecutive = updateCounter(room.pm25(), pm25Target, DomainConstants.PM25_EPSILON, pm25Consecutive);
    }

    private int updateCounter(double value, double target, double epsilon, int current) {
        return Math.abs(value - target) <= epsilon ? current + 1 : 0;
    }

    public boolean convergedAll() {
        return tempConsecutive >= DomainConstants.N_CONSECUTIVE
                && humidityConsecutive >= DomainConstants.N_CONSECUTIVE
                && co2Consecutive >= DomainConstants.N_CONSECUTIVE
                && pm25Consecutive >= DomainConstants.N_CONSECUTIVE;
    }
}
