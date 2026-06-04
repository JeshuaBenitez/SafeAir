package com.safeair.emulator.api.dto;

import java.time.Instant;
import java.util.Arrays;

public final class MqttEnvelope {
    private final String topic;
    private final int qos;
    private final byte[] payloadBytes;
    private final Instant receivedAt;

    public MqttEnvelope(String topic, int qos, byte[] payloadBytes, Instant receivedAt) {
        this.topic = topic;
        this.qos = qos;
        this.payloadBytes = payloadBytes == null ? new byte[0] : Arrays.copyOf(payloadBytes, payloadBytes.length);
        this.receivedAt = receivedAt == null ? Instant.now() : receivedAt;
    }

    public String topic() {
        return topic;
    }

    public int qos() {
        return qos;
    }

    public byte[] payloadBytes() {
        return Arrays.copyOf(payloadBytes, payloadBytes.length);
    }

    public Instant receivedAt() {
        return receivedAt;
    }
}
