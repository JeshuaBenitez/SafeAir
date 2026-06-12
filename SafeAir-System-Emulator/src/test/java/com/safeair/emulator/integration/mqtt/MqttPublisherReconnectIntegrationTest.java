package com.safeair.emulator.integration.mqtt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MqttPublisher;
import com.safeair.emulator.config.MqttProperties;

/** Integration test for MQTT publisher reconnection behavior. */
class MqttPublisherReconnectIntegrationTest {

    @Test
    void publish_afterReconnect_resumesWithoutRestart() {
        FakeConnector connector = new FakeConnector();
        MqttPublisher publisher = new MqttPublisher(connector, new TelemetryAdapter());

        connector.disconnect();
        publisher.publish("safeair/EMU-0001/telemetry", "payload-before-reconnect");

        connector.reconnect();
        publisher.publish("safeair/EMU-0001/telemetry", "payload-after-reconnect");

        assertEquals(1, connector.publishCount());
        assertTrue(connector.lastTopic().endsWith("/telemetry"));
    }

    private static final class FakeConnector extends MQTTConnector {
        private boolean connected = true;
        private int publishCount;
        private String lastTopic;

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
        public boolean publish(String topic, byte[] payload, int qos) {
            if (!connected) {
                return false;
            }
            publishCount++;
            lastTopic = topic;
            return true;
        }

        int publishCount() {
            return publishCount;
        }

        String lastTopic() {
            return lastTopic;
        }
    }
}
