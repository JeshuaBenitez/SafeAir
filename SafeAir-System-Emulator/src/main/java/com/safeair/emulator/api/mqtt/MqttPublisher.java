package com.safeair.emulator.api.mqtt;

import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.manager.EmulatorLogStore;

/**
 * Publishes critical MQTT messages directly and telemetry through a bounded,
 * latest-value buffer so broker latency cannot block simulation dispatch.
 */
public class MqttPublisher extends SendInfo implements Subject {
    private static final Logger LOGGER = LoggerFactory.getLogger(MqttPublisher.class);
    private static final long WORKER_IDLE_WAIT_MS = 250;

    private final MQTTConnector connector;
    private final TelemetryAdapter telemetryAdapter;
    private final MqttProperties properties;
    private final EmulatorLogStore logStore;
    private final ExecutorService telemetryExecutor;
    private final Object pendingMonitor = new Object();
    private final LinkedHashMap<String, PendingTelemetry> pendingByEmulator =
            new LinkedHashMap<>(16, 0.75f, true);
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final AtomicBoolean outageActive = new AtomicBoolean(false);
    private final AtomicLong mqttPublishSuccess = new AtomicLong();
    private final AtomicLong mqttPublishFailed = new AtomicLong();
    private final AtomicLong mqttPublishSkipped = new AtomicLong();
    private final AtomicLong mqttQueueDropped = new AtomicLong();
    private final AtomicLong summaryFailed = new AtomicLong();
    private final AtomicLong summarySkipped = new AtomicLong();
    private final AtomicLong summaryDropped = new AtomicLong();
    private final AtomicLong lastSummaryAt = new AtomicLong();
    private final AtomicLong lastPublisherWarningAt = new AtomicLong();

    private volatile Future<?> workerTask;
    private volatile String lastMqttPublishError;

    public MqttPublisher() {
        this(null, null, new MqttProperties(), null);
    }

    public MqttPublisher(MQTTConnector connector, TelemetryAdapter telemetryAdapter) {
        this(connector, telemetryAdapter, new MqttProperties(), null);
    }

    public MqttPublisher(
            MQTTConnector connector,
            TelemetryAdapter telemetryAdapter,
            MqttProperties properties,
            EmulatorLogStore logStore) {
        this.connector = connector;
        this.telemetryAdapter = telemetryAdapter;
        this.properties = properties == null ? new MqttProperties() : properties;
        this.logStore = logStore;
        this.telemetryExecutor = Executors.newSingleThreadExecutor(
                Thread.ofVirtual().name("mqtt-telemetry-publisher-", 0).factory());
    }

    public void start() {
        if (connector == null || !running.compareAndSet(false, true)) {
            return;
        }
        workerTask = telemetryExecutor.submit(this::publishTelemetryLoop);
    }

    public void stop() {
        running.set(false);
        synchronized (pendingMonitor) {
            pendingMonitor.notifyAll();
        }
        Future<?> task = workerTask;
        if (task != null) {
            task.cancel(true);
        }
        telemetryExecutor.shutdownNow();
    }

    @Override
    public void send(Object data) {
        if (data instanceof TelemetryPayload payload && telemetryAdapter != null) {
            publish(MqttTopics.telemetryTopic(payload.emulatorId()), telemetryAdapter.toProtobuf(payload));
            return;
        }
        publish("safeair/telemetry", data);
    }

    @Override
    public void publish(String topic, Object payload) {
        if (connector == null) {
            warnPublisherUnavailable(topic);
            return;
        }

        byte[] bytes = toBytes(payload);
        if (isTelemetryTopic(topic)) {
            start();
            enqueueLatestTelemetry(topic, bytes);
            return;
        }

        boolean published = connector.publish(topic, bytes, MqttTopics.CONFIG_QOS);
        if (published) {
            LOGGER.debug("Published critical MQTT message successfully topic={} broker={}",
                    topic,
                    connector.brokerUrl());
        }
    }

    public MqttTelemetryPublishMetrics telemetryMetrics() {
        synchronized (pendingMonitor) {
            return new MqttTelemetryPublishMetrics(
                    mqttPublishSuccess.get(),
                    mqttPublishFailed.get(),
                    mqttPublishSkipped.get(),
                    mqttQueueDropped.get(),
                    pendingByEmulator.size(),
                    lastMqttPublishError);
        }
    }

    private void enqueueLatestTelemetry(String topic, byte[] payload) {
        String emulatorId = emulatorIdFromTelemetryTopic(topic);
        PendingTelemetry next = new PendingTelemetry(emulatorId, topic, payload);

        synchronized (pendingMonitor) {
            PendingTelemetry replaced = pendingByEmulator.put(emulatorId, next);
            if (replaced != null) {
                recordDropped("backpressure");
            } else if (pendingByEmulator.size() > telemetryPendingCapacity()) {
                Iterator<Map.Entry<String, PendingTelemetry>> iterator =
                        pendingByEmulator.entrySet().iterator();
                if (iterator.hasNext()) {
                    iterator.next();
                    iterator.remove();
                    recordDropped("capacity");
                }
            }
            pendingMonitor.notifyAll();
        }
    }

    private void publishTelemetryLoop() {
        while (running.get() && !Thread.currentThread().isInterrupted()) {
            PendingTelemetry pending;
            try {
                pending = takeNextTelemetry();
            } catch (InterruptedException interrupted) {
                Thread.currentThread().interrupt();
                return;
            }
            if (pending == null) {
                continue;
            }

            MQTTConnector.PublishResult result =
                    connector.publishTelemetry(pending.topic(), pending.payload());
            if (result == MQTTConnector.PublishResult.SUCCESS) {
                mqttPublishSuccess.incrementAndGet();
                recordRecoveryIfNeeded();
                continue;
            }

            if (result == MQTTConnector.PublishResult.DISCONNECTED) {
                mqttPublishSkipped.incrementAndGet();
                summarySkipped.incrementAndGet();
                lastMqttPublishError = "disconnected";
            } else {
                mqttPublishFailed.incrementAndGet();
                summaryFailed.incrementAndGet();
                lastMqttPublishError = "publish-timeout-or-error";
            }

            outageActive.set(true);
            requeueUnlessNewer(pending);
            recordProblemSummary(lastMqttPublishError);
            pauseBeforeRetry();
        }
    }

    private PendingTelemetry takeNextTelemetry() throws InterruptedException {
        synchronized (pendingMonitor) {
            while (running.get() && pendingByEmulator.isEmpty()) {
                pendingMonitor.wait(WORKER_IDLE_WAIT_MS);
            }
            if (!running.get() || pendingByEmulator.isEmpty()) {
                return null;
            }

            Iterator<Map.Entry<String, PendingTelemetry>> iterator =
                    pendingByEmulator.entrySet().iterator();
            Map.Entry<String, PendingTelemetry> next = iterator.next();
            iterator.remove();
            return next.getValue();
        }
    }

    private void requeueUnlessNewer(PendingTelemetry failed) {
        synchronized (pendingMonitor) {
            if (!pendingByEmulator.containsKey(failed.emulatorId())) {
                pendingByEmulator.put(failed.emulatorId(), failed);
            }
            pendingMonitor.notifyAll();
        }
    }

    private void pauseBeforeRetry() {
        try {
            Thread.sleep(Math.max(100, properties.getTelemetryRetryDelayMillis()));
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        }
    }

    private void recordDropped(String reason) {
        mqttQueueDropped.incrementAndGet();
        summaryDropped.incrementAndGet();
        recordProblemSummary(reason);
    }

    private void recordProblemSummary(String reason) {
        long now = System.currentTimeMillis();
        long intervalMs = TimeUnit.SECONDS.toMillis(
                Math.max(1, properties.getPublishWarningIntervalSeconds()));
        long previous = lastSummaryAt.get();
        if (now - previous < intervalMs || !lastSummaryAt.compareAndSet(previous, now)) {
            return;
        }

        long failed = summaryFailed.getAndSet(0);
        long skipped = summarySkipped.getAndSet(0);
        long dropped = summaryDropped.getAndSet(0);
        String message = "MQTT telemetry publish delayed/skipped broker=" + connector.brokerUrl()
                + " failed=" + failed
                + " skipped=" + skipped
                + " dropped=" + dropped
                + " pending=" + pendingSize()
                + " reason=" + reason;
        LOGGER.debug(message);
        recordEvent("mqtt.telemetry.publish.summary", message);
    }

    private void recordRecoveryIfNeeded() {
        if (!outageActive.compareAndSet(true, false)) {
            return;
        }
        String message = "MQTT telemetry publishing recovered broker=" + connector.brokerUrl()
                + " success=" + mqttPublishSuccess.get()
                + " pending=" + pendingSize();
        LOGGER.debug(message);
        recordEvent("mqtt.telemetry.publish.recovered", message);
    }

    private int pendingSize() {
        synchronized (pendingMonitor) {
            return pendingByEmulator.size();
        }
    }

    private int telemetryPendingCapacity() {
        return Math.max(1, properties.getTelemetryPendingCapacity());
    }

    private void warnPublisherUnavailable(String topic) {
        long now = System.currentTimeMillis();
        long intervalMs = TimeUnit.SECONDS.toMillis(
                Math.max(1, properties.getPublishWarningIntervalSeconds()));
        long previous = lastPublisherWarningAt.get();
        String message = "MQTT publish skipped because publisher has no connector topic=" + topic;
        if (now - previous < intervalMs || !lastPublisherWarningAt.compareAndSet(previous, now)) {
            LOGGER.debug(message);
            return;
        }
        LOGGER.warn(message);
    }

    private void recordEvent(String category, String message) {
        if (logStore != null) {
            logStore.onEvent("mqtt", category, message);
        }
    }

    private byte[] toBytes(Object payload) {
        if (payload instanceof byte[] payloadBytes) {
            return payloadBytes;
        }
        if (payload != null) {
            return payload.toString().getBytes(StandardCharsets.UTF_8);
        }
        return new byte[0];
    }

    private boolean isTelemetryTopic(String topic) {
        return topic != null && topic.endsWith("/telemetry");
    }

    private String emulatorIdFromTelemetryTopic(String topic) {
        String[] parts = topic.split("/");
        return parts.length >= 3 ? parts[parts.length - 2] : topic;
    }

    private record PendingTelemetry(String emulatorId, String topic, byte[] payload) {}

    public record MqttTelemetryPublishMetrics(
            long mqttPublishSuccess,
            long mqttPublishFailed,
            long mqttPublishSkipped,
            long mqttQueueDropped,
            int pending,
            String lastMqttPublishError) {}
}
