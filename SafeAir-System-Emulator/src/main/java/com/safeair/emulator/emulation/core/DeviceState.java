package com.safeair.emulator.emulation.core;

import java.util.Collections;
import java.util.Map;

public final class DeviceState {
    private final boolean on;
    private final Map<String, Integer> attributes;

    public DeviceState(boolean on, Map<String, Integer> attributes) {
        this.on = on;
        this.attributes = attributes == null ? Map.of() : Collections.unmodifiableMap(attributes);
    }

    public boolean isOn() {
        return on;
    }

    public Map<String, Integer> attributes() {
        return attributes;
    }

    @Override
    public String toString() {
        return "DeviceState{"
                + "on=" + on
                + ", attributes=" + attributes
                + '}';
    }
}
