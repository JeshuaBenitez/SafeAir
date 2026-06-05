package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.DomainValidators;

public class AirExtractor extends Electrodomestic {
    private int state;

    @Override
    public void setState(int value) {
        state = DomainValidators.validateAirExtractor(value);
        setOn(state == 1);
    }

    @Override
    public int getNormalizedState() {
        return state;
    }

    @Override
    public String getType() {
        return "AirExtractor";
    }
}
