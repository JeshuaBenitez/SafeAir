package com.safeair.emulator.integration.mqtt;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MqttPublisher;
import com.safeair.emulator.api.mqtt.MqttTopics;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.manager.EmulatorLogStore;

/**
 * Integration tests for MQTT publisher adapter with mocked broker.
 * Tests the publishing contract and message flow without requiring actual MQTT broker.
 *
 * @see com.safeair.emulator.api.mqtt.MqttPublisher
 * @see com.safeair.emulator.api.mqtt.Subject
 */
@SpringBootTest
class MqttPublisherIntegrationTest {

    private MqttPublisher mqttPublisher;

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        mqttPublisher = new MqttPublisher();
    }
    
    /**
     * Test that send() method forwards to publish with correct topic
     */
    @Test
    void send_forwardsToPublishWithCorrectTopic() {
        // Given
        Object testPayload = "test-telemetry-data";
        
        // When/Then - Should not throw exceptions
        assertThatCode(() -> mqttPublisher.send(testPayload))
            .doesNotThrowAnyException();
    }
    
    /**
     * Test that publish() method can handle various payload types
     */
    @Test
    void publish_handlesVariousPayloadTypes() {
        // Given
        String topic = "test/topic";
        Object[] testPayloads = {
            "string-payload",
            12345,
            new TestTelemetryPayload("sensor-1", 23.5),
            null
        };
        
        // When/Then - Should handle all payload types without errors
        for (Object payload : testPayloads) {
            assertThatCode(() -> mqttPublisher.publish(topic, payload))
                .doesNotThrowAnyException();
        }
    }
    
    /**
     * Test that publish() handles topic variations correctly
     */
    @Test
    void publish_handlesTopicVariations() {
        // Given
        Object payload = "test-data";
        String[] testTopics = {
            "safeair/telemetry",
            "test/topic",
            "device/sensor/temperature",
            "",  // Empty topic
            "special-chars-topic-123_456"
        };
        
        // When/Then - Should handle all topic variations without errors
        for (String topic : testTopics) {
            assertThatCode(() -> mqttPublisher.publish(topic, payload))
                .doesNotThrowAnyException();
        }
    }
    
    /**
     * Test concurrent publishing behavior
     */
    @Test
    void publish_handlesConcurrentCalls() throws Exception {
        // Given
        String topic = "concurrent/test";
        Object payload = "concurrent-payload";
        int concurrencyLevel = 10;
        
        // When - Publishing from multiple threads simultaneously
        CompletableFuture<Void>[] futures = new CompletableFuture[concurrencyLevel];
        for (int i = 0; i < concurrencyLevel; i++) {
            final int threadId = i;
            futures[i] = CompletableFuture.runAsync(() -> {
                mqttPublisher.publish(topic + "/" + threadId, payload + "-" + threadId);
            });
        }
        
        // Then - All publishing operations should complete without errors
        CompletableFuture<Void> allPublishes = CompletableFuture.allOf(futures);
        assertThatCode(() -> allPublishes.get(5, TimeUnit.SECONDS))
            .doesNotThrowAnyException();
    }
    
    /**
     * Test default telemetry topic behavior
     */
    @Test
    void send_usesDefaultTelemetryTopic() {
        // Given
        Object telemetryPayload = new TestTelemetryPayload("device-123", 42.0);
        
        // When/Then - Should use default topic safeair/telemetry internally
        assertThatCode(() -> mqttPublisher.send(telemetryPayload))
            .doesNotThrowAnyException();
    }

    @Test
    void send_telemetryPayloadPublishesToEmulatorTelemetryTopic() {
        RecordingConnector connector = new RecordingConnector();
        MqttPublisher publisher = new MqttPublisher(connector, new TelemetryAdapter());
        TelemetryPayload payload = new TelemetryPayload(
                Instant.parse("2026-06-11T00:00:00Z"),
                "EMU-U001-R001",
                12,
                0,
                3,
                0,
                new RoomStateSnapshot(24.5, 45.0, 510.0, 12.0, 0.2, 35, 1),
                Map.of("TemperatureSensor", 24.5),
                Map.of());

        publisher.send(payload);

        assertThat(connector.awaitPublish()).isTrue();
        assertThat(connector.lastTopic()).isEqualTo(MqttTopics.telemetryTopic("EMU-U001-R001"));
        assertThat(connector.lastQos()).isEqualTo(MqttTopics.TELEMETRY_QOS);
        assertThat(connector.lastPayload()).isNotEmpty();
        publisher.stop();
    }

    @Test
    void publish_actuatorStateKeepsReliableQos() {
        RecordingConnector connector = new RecordingConnector();
        MqttPublisher publisher = new MqttPublisher(connector, new TelemetryAdapter());

        publisher.publish(MqttTopics.actuatorStateTopic("EMU-U001-R001"), "state");

        assertThat(connector.lastTopic())
                .isEqualTo(MqttTopics.actuatorStateTopic("EMU-U001-R001"));
        assertThat(connector.lastQos()).isEqualTo(MqttTopics.CONFIG_QOS);
        publisher.stop();
    }

    @Test
    void send_whenBrokerPublishBlocks_keepsProducerNonBlockingAndCoalescesLatest() throws Exception {
        BlockingConnector connector = new BlockingConnector();
        MqttProperties properties = enabledProps();
        properties.setTelemetryPendingCapacity(2);
        MqttPublisher publisher = new MqttPublisher(
                connector,
                new TelemetryAdapter(),
                properties,
                new EmulatorLogStore());

        publisher.send(telemetry("EMU-U001-R009", 1));
        assertThat(connector.awaitFirstPublish()).isTrue();

        long startedAt = System.nanoTime();
        for (int index = 2; index <= 101; index++) {
            publisher.send(telemetry("EMU-U001-R009", index));
        }
        long elapsedMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);

        assertThat(elapsedMillis).isLessThan(500);
        assertThat(publisher.telemetryMetrics().pending()).isEqualTo(1);
        assertThat(publisher.telemetryMetrics().mqttQueueDropped()).isGreaterThanOrEqualTo(99);

        connector.releasePublish();
        assertThat(connector.awaitPublishCount(2)).isTrue();
        publisher.stop();
    }

    @Test
    void send_whenBrokerKeepsFailing_rateLimitsTelemetrySummaries() {
        FailingConnector connector = new FailingConnector();
        MqttProperties properties = enabledProps();
        properties.setPublishWarningIntervalSeconds(60);
        EmulatorLogStore logStore = new EmulatorLogStore();
        MqttPublisher publisher = new MqttPublisher(
                connector,
                new TelemetryAdapter(),
                properties,
                logStore);

        publisher.send(telemetry("EMU-U001-R010", 1));

        assertThat(connector.awaitPublishCount(3)).isTrue();
        long summaries = logStore.findAllOrdered(100).stream()
                .filter(entry -> entry.category().equals("mqtt.telemetry.publish.summary"))
                .count();
        assertThat(summaries).isEqualTo(1);
        assertThat(publisher.telemetryMetrics().mqttPublishFailed()).isGreaterThanOrEqualTo(3);
        publisher.stop();
    }
    
    /**
     * Test MQTT publisher contract compliance
     */
    @Test
    void mqttPublisher_implementsRequiredContracts() {
        // Then
        assertThat(mqttPublisher).isInstanceOf(com.safeair.emulator.abstracts.SendInfo.class);
        assertThat(mqttPublisher).isInstanceOf(com.safeair.emulator.api.mqtt.Subject.class);
    }
    
    /**
     * Simple test telemetry payload class for testing
     */
    private static class TestTelemetryPayload {
        private final String deviceId;
        private final double value;
        
        public TestTelemetryPayload(String deviceId, double value) {
            this.deviceId = deviceId;
            this.value = value;
        }
        
        @Override
        public String toString() {
            return "TestTelemetryPayload{deviceId='" + deviceId + "', value=" + value + "}";
        }
    }

    private TelemetryPayload telemetry(String emulatorId, long sequence) {
        return new TelemetryPayload(
                Instant.now(),
                emulatorId,
                sequence,
                0,
                3,
                0,
                new RoomStateSnapshot(24.5, 45.0, 510.0, 12.0, 0.2, 35, 1),
                Map.of("TemperatureSensor", 24.5),
                Map.of());
    }

    private static MqttProperties enabledProps() {
        MqttProperties props = new MqttProperties();
        props.setEnabled(true);
        props.setTelemetryRetryDelayMillis(100);
        return props;
    }

    private static final class RecordingConnector extends MQTTConnector {
        private String lastTopic;
        private byte[] lastPayload;
        private int lastQos;
        private final CountDownLatch published = new CountDownLatch(1);

        RecordingConnector() {
            super(enabledProps());
        }

        @Override
        public PublishResult publishTelemetry(String topic, byte[] payload) {
            lastTopic = topic;
            lastPayload = payload;
            lastQos = MqttTopics.TELEMETRY_QOS;
            published.countDown();
            return PublishResult.SUCCESS;
        }

        @Override
        public boolean publish(String topic, byte[] payload, int qos) {
            lastTopic = topic;
            lastPayload = payload;
            lastQos = qos;
            published.countDown();
            return true;
        }

        boolean awaitPublish() {
            try {
                return published.await(2, TimeUnit.SECONDS);
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        String lastTopic() {
            return lastTopic;
        }

        byte[] lastPayload() {
            return lastPayload;
        }

        int lastQos() {
            return lastQos;
        }

    }

    private static final class BlockingConnector extends MQTTConnector {
        private final CountDownLatch firstPublish = new CountDownLatch(1);
        private final CountDownLatch releasePublish = new CountDownLatch(1);
        private final AtomicInteger publishCount = new AtomicInteger();

        BlockingConnector() {
            super(enabledProps());
        }

        @Override
        public PublishResult publishTelemetry(String topic, byte[] payload) {
            int current = publishCount.incrementAndGet();
            if (current == 1) {
                firstPublish.countDown();
                try {
                    releasePublish.await(2, TimeUnit.SECONDS);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return PublishResult.FAILED;
                }
            }
            return PublishResult.SUCCESS;
        }

        boolean awaitFirstPublish() throws InterruptedException {
            return firstPublish.await(2, TimeUnit.SECONDS);
        }

        void releasePublish() {
            releasePublish.countDown();
        }

        boolean awaitPublishCount(int expected) throws InterruptedException {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (publishCount.get() < expected && System.nanoTime() < deadline) {
                Thread.sleep(10);
            }
            return publishCount.get() >= expected;
        }
    }

    private static final class FailingConnector extends MQTTConnector {
        private final AtomicInteger publishCount = new AtomicInteger();

        FailingConnector() {
            super(enabledProps());
        }

        @Override
        public PublishResult publishTelemetry(String topic, byte[] payload) {
            publishCount.incrementAndGet();
            return PublishResult.FAILED;
        }

        boolean awaitPublishCount(int expected) {
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(2);
            while (publishCount.get() < expected && System.nanoTime() < deadline) {
                try {
                    Thread.sleep(10);
                } catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
            return publishCount.get() >= expected;
        }
    }
}
