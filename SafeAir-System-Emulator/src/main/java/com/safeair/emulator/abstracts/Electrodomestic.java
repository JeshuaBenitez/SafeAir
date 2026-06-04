package com.safeair.emulator.abstracts;

public abstract class Electrodomestic {
    private boolean on;

    public void toggle() {
        on = !on;
    }

    public boolean isOn() {
        return on;
    }

    protected void setOn(boolean value) {
        this.on = value;
    }

    public abstract void setState(int value);

    public abstract int getNormalizedState();

    public abstract String getType();
}
