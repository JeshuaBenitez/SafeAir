package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.DomainValidators;

public class HumidifierPurifier extends Electrodomestic {
    private int level = 1;

    /**
     * Updates the level of this HumidifierPurifier.
     * Does NOT change the on/off state — the on/off state is controlled
     * by explicit turn_on/turn_off MQTT commands via toggle().
     */
    @Override
    public void setState(int value) {
        level = DomainValidators.validateHumidifier(value);
        // Do NOT call setOn(true) here.
    }

    public int getLevel() {
        return level;
    }

    @Override
    public int getNormalizedState() {
        return level;
    }

    @Override
    public String getType() {
        return "HumidifierPurifier";
    }
}
