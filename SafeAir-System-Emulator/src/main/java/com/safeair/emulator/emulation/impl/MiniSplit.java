package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.DomainValidators;

public class MiniSplit extends Electrodomestic {
    private int setpoint = 24;

    @Override
    public void setState(int value) {
        setpoint = DomainValidators.validateMiniSplit(value);
        setOn(true);
    }

    public int getSetpoint() {
        return setpoint;
    }

    @Override
    public int getNormalizedState() {
        return setpoint;
    }

    @Override
    public String getType() {
        return "MiniSplit";
    }
}
