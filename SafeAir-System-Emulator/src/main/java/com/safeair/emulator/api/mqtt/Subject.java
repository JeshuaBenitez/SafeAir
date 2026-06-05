package com.safeair.emulator.api.mqtt;

public interface Subject {
    void publish(String topic, Object payload);
}
