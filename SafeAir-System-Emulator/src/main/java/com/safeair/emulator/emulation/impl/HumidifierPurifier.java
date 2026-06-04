package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.DomainValidators;

public class HumidifierPurifier extends Electrodomestic {
    private int level = 1;

    @Override
    public void setState(int value) {
        level = DomainValidators.validateHumidifier(value);
        setOn(true);
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
