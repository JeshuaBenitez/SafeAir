package com.safeair.emulator.emulation.impl;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.DomainValidators;

public class MiniSplit extends Electrodomestic {
    private int setpoint = 24;

    /**
     * Updates the setpoint (target temperature) for this MiniSplit.
     * Does NOT change the on/off state — the caller must use {@link #toggle()}
     * or the explicit ON/OFF command path (ActuatorCommandSubscriber) to control
     * whether the device is powered on.
     *
     * Previously this method unconditionally called setOn(true), which meant
     * any temperature setpoint change would forcibly turn the device ON,
     * making it impossible to turn OFF via the debug dashboard.
     */
    @Override
    public void setState(int value) {
        setpoint = DomainValidators.validateMiniSplit(value);
        // Do NOT call setOn(true) here — the on/off state is controlled
        // by explicit turn_on/turn_off MQTT commands only.
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
