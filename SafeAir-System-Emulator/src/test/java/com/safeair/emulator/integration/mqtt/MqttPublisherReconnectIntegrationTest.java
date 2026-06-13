package com.safeair.emulator.integration.mqtt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MqttPublisher;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;

/** Integration test for MQTT publisher reconnection behavior. */
class MqttPublisherReconnectIntegrationTest {

    @Test
    void publish_afterReconnect_resumesWithoutRestart() {
        FakeConnector connector = new FakeConnector();
        MqttProperties properties = new MqttProperties();
        properties.setTelemetryRetryDelayMillis(100);
        MqttPublisher publisher = new MqttPublisher(connector, new TelemetryAdapter(), properties, null);

        connector.disconnect();
        publisher.send(telemetry());
        assertTrue(await(() -> publisher.telemetryMetrics().mqttPublishSkipped() > 0));

        connector.reconnect();
        assertTrue(await(() -> connector.publishCount() == 1));

        assertEquals(1, connector.publishCount());
        assertTrue(connector.lastTopic().endsWith("/telemetry"));
        assertEquals(1, publisher.telemetryMetrics().mqttPublishSuccess());
        publisher.stop();
    }

    private TelemetryPayload telemetry() {
        return new TelemetryPayload(
                Instant.now(),
                "EMU-0001",
                1,
                0,
                1,
                0,
                new RoomStateSnapshot(24, 45, 500, 10, 0.2, 35, 1),
                Map.of(),
                Map.of());
    }

    private boolean await(Check check) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        while (System.nanoTime() < deadline) {
            if (check.isTrue()) {
                return true;
            }
            try {
                Thread.sleep(20);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return false;
    }

    private static final class FakeConnector extends MQTTConnector {
        private volatile boolean connected = true;
        private final AtomicInteger publishCount = new AtomicInteger();
        private volatile String lastTopic;

        FakeConnector() {
            super(new MqttProperties());
        }

        void disconnect() {
            connected = false;
        }

        void reconnect() {
            connected = true;
        }

        @Override
        public PublishResult publishTelemetry(String topic, byte[] payload) {
            if (!connected) {
                return PublishResult.DISCONNECTED;
            }
            publishCount.incrementAndGet();
            lastTopic = topic;
            return PublishResult.SUCCESS;
        }

        int publishCount() {
            return publishCount.get();
        }

        String lastTopic() {
            return lastTopic;
        }
    }

    @FunctionalInterface
    private interface Check {
        boolean isTrue();
    }
}
