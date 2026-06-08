package com.safeair.emulator.api.mqtt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.api.adapter.ConfigAdapter;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.manager.ConfigDispatcher;

public class MQTTSubscriber {
    private static final Logger LOGGER = LoggerFactory.getLogger(MQTTSubscriber.class);

    private final MQTTConnector connector;
    private final ConfigAdapter adapter;
    private final ConfigDispatcher dispatcher;

    public MQTTSubscriber(MQTTConnector connector, ConfigAdapter adapter, ConfigDispatcher dispatcher) {
        this.connector = connector;
        this.adapter = adapter;
        this.dispatcher = dispatcher;
    }

    public void start() {
        if (!connector.isEnabled()) {
            return;
        }

        connector.registerHandler(this::onMessage);
        connector.subscribe(MqttTopics.GLOBAL_CONFIG_TOPIC, MqttTopics.CONFIG_QOS);
        connector.subscribe(MqttTopics.EMULATOR_CONFIG_WILDCARD, MqttTopics.CONFIG_QOS);
    }

    public void stop() {
        // No-op for now.
    }

    public void onMessage(String topic, byte[] payload) {
        if (!MqttTopics.isGlobalConfigTopic(topic) && !isEmulatorConfigTopic(topic)) {
            return;
        }

        try {
            ConfigCommand command = adapter.toCommand(payload);
            String[] parts = topic.split("/");
            if (parts.length == 3 && "safeair".equals(parts[0]) && "config".equals(parts[2])) {
                command = new ConfigCommand(
                        command.commandId(),
                        ConfigCommand.Scope.EMULATOR,
                        parts[1],
                        command.receivedAtUtc(),
                        command.sequence(),
                        command.payload());
            }
            dispatcher.enqueue(command);
        } catch (RuntimeException ex) {
            LOGGER.warn("Rejected invalid MQTT config payload for topic {}", topic, ex);
        }
    }

    private boolean isEmulatorConfigTopic(String topic) {
        String[] parts = topic.split("/");
        return parts.length == 3 && "safeair".equals(parts[0]) && "config".equals(parts[2]);
    }
}
