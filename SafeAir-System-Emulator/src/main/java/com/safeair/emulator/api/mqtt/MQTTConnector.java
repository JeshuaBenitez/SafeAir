package com.safeair.emulator.api.mqtt;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.BiConsumer;

import javax.net.ssl.SSLSocketFactory;

import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.config.MqttProperties;

public class MQTTConnector {
    private static final Logger LOGGER = LoggerFactory.getLogger(MQTTConnector.class);

    private final MqttProperties properties;
    private final List<Subscription> subscriptions = new CopyOnWriteArrayList<>();
    private final List<BiConsumer<String, byte[]>> handlers = new CopyOnWriteArrayList<>();
    private final Object lock = new Object();

    private MqttClient client;

    public MQTTConnector(MqttProperties properties) {
        this.properties = properties;
    }

    public void start() {
        if (!properties.isEnabled()) {
            LOGGER.info("MQTT disabled by configuration");
            return;
        }
        connectIfNeeded();
    }

    public void stop() {
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
        if (!properties.isEnabled()) {
            LOGGER.warn("MQTT publish skipped because MQTT is disabled topic={}", topic);
            return false;
        }
        connectIfNeeded();
        synchronized (lock) {
            if (client == null || !client.isConnected()) {
                LOGGER.warn(
                        "MQTT publish skipped because client is not connected topic={} broker={}",
                        topic,
                        brokerUrl());
                return false;
            }
            try {
                MqttMessage message = new MqttMessage(payload);
                message.setQos(qos);
                client.publish(topic, message);
                return true;
            } catch (MqttException e) {
                LOGGER.error(
                        "Failed to publish MQTT message topic={} broker={} cause={}",
                        topic,
                        brokerUrl(),
                        e.getMessage(),
                        e);
                return false;
            }
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
                closeQuietly(client);
                client = null;
            }
            try {
                client = new MqttClient(brokerUrl(), MqttClient.generateClientId(), new MemoryPersistence());

                MqttConnectOptions options = new MqttConnectOptions();
                options.setAutomaticReconnect(false);
                options.setCleanSession(true);
                options.setConnectionTimeout(5);
                options.setKeepAliveInterval(30);
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
                LOGGER.info(
                        "Connected to MQTT broker {} as user {} TLS={}",
                        brokerUrl(),
                        properties.getUsername(),
                        properties.getTls().isEnabled());

                for (Subscription subscription : new ArrayList<>(subscriptions)) {
                    subscribeInternal(subscription);
                }
            } catch (MqttException e) {
                LOGGER.error(
                        "Failed to connect MQTT client broker={} TLS={} cause={}",
                        brokerUrl(),
                        properties.getTls().isEnabled(),
                        e.getMessage(),
                        e);
            }
        }
    }

    private void subscribeInternal(Subscription subscription) {
        try {
            if (client != null && client.isConnected()) {
                client.subscribe(subscription.topic, subscription.qos);
                LOGGER.info("Subscribed to topic {} with QoS {}", subscription.topic, subscription.qos);
            }
        } catch (MqttException e) {
            LOGGER.warn("Failed to subscribe topic {}", subscription.topic, e);
        }
    }

    private class ConnectorCallback implements MqttCallback {
        @Override
        public void connectionLost(Throwable cause) {
            LOGGER.warn("MQTT connection lost", cause);
            synchronized (lock) {
                closeQuietly(client);
                client = null;
            }
        }

        @Override
        public void messageArrived(String topic, MqttMessage message) {
            byte[] payload = message.getPayload();
            for (BiConsumer<String, byte[]> handler : handlers) {
                handler.accept(topic, payload);
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

    private record Subscription(String topic, int qos) {}
}
