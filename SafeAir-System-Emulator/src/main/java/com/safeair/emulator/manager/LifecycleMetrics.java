package com.safeair.emulator.manager;

public class LifecycleMetrics {
    private volatile int activeEmulators;

    public int getActiveEmulators() {
        return activeEmulators;
    }

    public void setActiveEmulators(int activeEmulators) {
        this.activeEmulators = activeEmulators;
    }
}
