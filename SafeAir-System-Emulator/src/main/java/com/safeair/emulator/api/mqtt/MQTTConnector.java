package com.safeair.emulator.api.mqtt;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.BiConsumer;

import javax.net.ssl.SSLSocketFactory;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.manager.EmulatorLogStore;

public class MQTTConnector {
    private static final Logger LOGGER = LoggerFactory.getLogger(MQTTConnector.class);
    private static final long CONNECT_RETRY_INTERVAL_MS = TimeUnit.SECONDS.toMillis(10);

    private final MqttProperties properties;
    private final EmulatorLogStore logStore;
    private final List<Subscription> subscriptions = new CopyOnWriteArrayList<>();
    private final List<BiConsumer<String, byte[]>> handlers = new CopyOnWriteArrayList<>();
    private final Object lock = new Object();
    private final AtomicLong lastPublishWarningAt = new AtomicLong(0);
    private final AtomicLong lastConnectAttemptAt = new AtomicLong(0);

    private MqttClient client;
    private volatile boolean stopping = false;
    private volatile String clientId;

    public MQTTConnector(MqttProperties properties) {
        this(properties, null);
    }

    public MQTTConnector(MqttProperties properties, EmulatorLogStore logStore) {
        this.properties = properties;
        this.logStore = logStore;
    }

    public void start() {
        if (!properties.isEnabled()) {
            LOGGER.debug("MQTT disabled by configuration");
            return;
        }
        stopping = false;
        connectIfNeeded();
    }

    public void stop() {
        stopping = true;
        synchronized (lock) {
            if (client == null) {
                return;
            }
            try {
                if (client.isConnected()) {
                    client.disconnect();
                }
                client.close();
            } catch (MqttException e) {
                LOGGER.warn("Error while closing MQTT client", e);
            } finally {
                client = null;
            }
        }
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public void registerHandler(BiConsumer<String, byte[]> handler) {
        handlers.add(handler);
    }

    public void subscribe(String topic, int qos) {
        Subscription subscription = new Subscription(topic, qos);
        if (!subscriptions.contains(subscription)) {
            subscriptions.add(subscription);
        }
        if (isConnected()) {
            subscribeInternal(subscription);
        }
    }

    public boolean publish(String topic, byte[] payload, int qos) {
        return publishInternal(topic, payload, qos, true) == PublishResult.SUCCESS;
    }

    public PublishResult publishTelemetry(String topic, byte[] payload) {
        return publishInternal(topic, payload, MqttTopics.TELEMETRY_QOS, false);
    }

    private PublishResult publishInternal(String topic, byte[] payload, int qos, boolean reportFailure) {
        if (!properties.isEnabled()) {
            if (reportFailure) {
                warnPublishSkipped("MQTT publish skipped because MQTT is disabled topic=" + topic);
            }
            return PublishResult.DISCONNECTED;
        }

        MqttClient activeClient;
        synchronized (lock) {
            if (client == null) {
                connectIfNeeded();
            }
            if (client == null || !client.isConnected()) {
                if (reportFailure) {
                    warnPublishSkipped("MQTT publish skipped because client is not connected topic="
                            + topic + " broker=" + brokerUrl());
                }
                return PublishResult.DISCONNECTED;
            }
            activeClient = client;
        }

        try {
            MqttMessage message = new MqttMessage(payload);
            message.setQos(qos);
            activeClient.publish(topic, message);
            return PublishResult.SUCCESS;
        } catch (MqttException e) {
            if (reportFailure) {
                warnWithOptionalStacktrace(
                        "Failed to publish MQTT message topic=" + topic
                                + " broker=" + brokerUrl()
                                + " cause=" + e.getMessage(),
                        e);
                recordEvent("mqtt.publish.failed", topic + " cause=" + e.getMessage());
            }
            return PublishResult.FAILED;
        }
    }

    public String brokerUrl() {
        String scheme = properties.getTls().isEnabled() ? "ssl" : "tcp";
        return scheme + "://" + properties.getHost() + ":" + properties.getPort();
    }

    private boolean isConnected() {
        synchronized (lock) {
            return client != null && client.isConnected();
        }
    }

    private void connectIfNeeded() {
        synchronized (lock) {
            if (client != null && client.isConnected()) {
                return;
            }
            if (client != null) {
                return;
            }

            long now = System.currentTimeMillis();
            long lastAttempt = lastConnectAttemptAt.get();
            if (lastAttempt > 0 && now - lastAttempt < CONNECT_RETRY_INTERVAL_MS) {
                return;
            }
            lastConnectAttemptAt.set(now);

            try {
                clientId = createClientId();
                client = new MqttClient(brokerUrl(), clientId, new MemoryPersistence());
                client.setTimeToWait(TimeUnit.SECONDS.toMillis(Math.max(1, properties.getConnectionTimeoutSeconds())));

                MqttConnectOptions options = new MqttConnectOptions();
                options.setAutomaticReconnect(true);
                options.setCleanSession(true);
                options.setConnectionTimeout(Math.max(1, properties.getConnectionTimeoutSeconds()));
                options.setKeepAliveInterval(Math.max(10, properties.getKeepAliveSeconds()));
                options.setMaxInflight(Math.max(10, properties.getMaxInflight()));
                if (properties.getTls().isEnabled()) {
                    options.setSocketFactory((SSLSocketFactory) SSLSocketFactory.getDefault());
                }

                if (properties.getUsername() != null && !properties.getUsername().isBlank()) {
                    options.setUserName(properties.getUsername());
                }
                if (properties.getPassword() != null) {
                    options.setPassword(properties.getPassword().toCharArray());
                }

                client.setCallback(new ConnectorCallback());
                client.connect(options);
                LOGGER.debug(
                        "Connected to MQTT broker {} clientId={} user={} TLS={} keepAlive={}s timeout={}s maxInflight={}",
                        brokerUrl(),
                        clientId,
                        properties.getUsername(),
                        properties.getTls().isEnabled(),
                        options.getKeepAliveInterval(),
                        options.getConnectionTimeout(),
                        options.getMaxInflight());

                for (Subscription subscription : new ArrayList<>(subscriptions)) {
                    subscribeInternal(subscription);
                }
            } catch (MqttException e) {
                warnWithOptionalStacktrace(
                        "Failed to connect MQTT client broker=" + brokerUrl()
                                + " TLS=" + properties.getTls().isEnabled()
                                + " cause=" + e.getMessage(),
                        e);
                recordEvent("mqtt.connect.failed", "broker=" + brokerUrl() + " cause=" + e.getMessage());
                closeQuietly(client);
                client = null;
            }
        }
    }

    private void subscribeInternal(Subscription subscription) {
        try {
            if (client != null && client.isConnected()) {
                client.subscribe(subscription.topic, subscription.qos);
                LOGGER.debug("Subscribed to topic {} with QoS {}", subscription.topic, subscription.qos);
                recordEvent("mqtt.subscribed", subscription.topic + " qos=" + subscription.qos);
            }
        } catch (MqttException e) {
            warnWithOptionalStacktrace("Failed to subscribe topic " + subscription.topic + " cause=" + e.getMessage(), e);
            recordEvent("mqtt.subscribe.failed", subscription.topic + " cause=" + e.getMessage());
        }
    }

    private class ConnectorCallback implements MqttCallbackExtended {
        @Override
        public void connectionLost(Throwable cause) {
            String reason = cause == null ? "unknown" : cause.getMessage();
            warnWithOptionalStacktrace("MQTT connection lost broker=" + brokerUrl() + " cause=" + reason, cause);
            recordEvent("mqtt.connection.lost", "broker=" + brokerUrl() + " cause=" + reason);
        }

        @Override
        public void connectComplete(boolean reconnect, String serverURI) {
            if (stopping) {
                return;
            }

            String event = reconnect ? "mqtt.reconnected" : "mqtt.connected";
            LOGGER.debug("{} broker={} clientId={}", event, serverURI, clientId);
            recordEvent(event, "broker=" + serverURI + " clientId=" + clientId);

            for (Subscription subscription : new ArrayList<>(subscriptions)) {
                subscribeInternal(subscription);
            }
        }

        @Override
        public void messageArrived(String topic, MqttMessage message) {
            byte[] payload = message.getPayload();
            for (BiConsumer<String, byte[]> handler : handlers) {
                try {
                    handler.accept(topic, payload);
                } catch (RuntimeException ex) {
                    warnWithOptionalStacktrace(
                            "MQTT handler failed topic=" + topic + " cause=" + ex.getMessage(),
                            ex);
                    recordEvent("mqtt.handler.failed", topic + " cause=" + ex.getMessage());
                }
            }
        }

        @Override
        public void deliveryComplete(IMqttDeliveryToken token) {
            // No-op.
        }
    }

    private void closeQuietly(MqttClient mqttClient) {
        if (mqttClient == null) {
            return;
        }
        try {
            if (mqttClient.isConnected()) {
                mqttClient.disconnect();
            }
            mqttClient.close();
        } catch (MqttException e) {
            LOGGER.debug("Ignoring MQTT client close error", e);
        }
    }

    private String createClientId() {
        String prefix = properties.getClientIdPrefix();
        if (prefix == null || prefix.isBlank()) {
            prefix = "safeair-emulator";
        }

        String sanitizedPrefix = prefix.replaceAll("[^A-Za-z0-9_-]", "-");
        long pid = ProcessHandle.current().pid();
        String random = UUID.randomUUID().toString().substring(0, 8);
        return sanitizedPrefix + "-" + pid + "-" + random;
    }

    private void warnPublishSkipped(String message) {
        long now = System.currentTimeMillis();
        long intervalMs = TimeUnit.SECONDS.toMillis(Math.max(1, properties.getPublishWarningIntervalSeconds()));
        long previous = lastPublishWarningAt.get();
        if (now - previous < intervalMs || !lastPublishWarningAt.compareAndSet(previous, now)) {
            LOGGER.debug(message);
            return;
        }

        LOGGER.warn(message);
        recordEvent("mqtt.publish.skipped", message);
    }

    private void warnWithOptionalStacktrace(String message, Throwable cause) {
        if (properties.isLogStacktrace()) {
            LOGGER.warn(message, cause);
            return;
        }

        LOGGER.warn(message);
        if (cause != null) {
            LOGGER.debug(message, cause);
        }
    }

    private void recordEvent(String category, String message) {
        if (logStore != null) {
            logStore.onEvent("mqtt", category, message);
        }
    }

    private record Subscription(String topic, int qos) {}

    public enum PublishResult {
        SUCCESS,
        DISCONNECTED,
        FAILED
    }
}
