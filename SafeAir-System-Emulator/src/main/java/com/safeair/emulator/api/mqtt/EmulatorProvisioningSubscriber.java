package com.safeair.emulator.api.mqtt;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;

public class EmulatorProvisioningSubscriber {
    private static final Logger LOGGER = LoggerFactory.getLogger(EmulatorProvisioningSubscriber.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final int DEFAULT_ROOM_SQUARE_METERS = 35;
    private static final int DEFAULT_WINDOW_COUNT = 1;
    private static final int DEFAULT_UPDATE_INTERVAL_SEC = 1;
    private static final int[] DEFAULT_SENSOR_TYPES = new int[] {1, 2, 3, 4};
    private static final int[] DEFAULT_DEVICE_TYPES = new int[] {1, 2, 3};

    private final MQTTConnector connector;
    private final EmulatorManager emulatorManager;
    private final TelemetryQueue telemetryQueue;
    private final EmulatorLogStore logStore;

    public EmulatorProvisioningSubscriber(
            MQTTConnector connector,
            EmulatorManager emulatorManager,
            TelemetryQueue telemetryQueue,
            EmulatorLogStore logStore) {
        this.connector = connector;
        this.emulatorManager = emulatorManager;
        this.telemetryQueue = telemetryQueue;
        this.logStore = logStore;
    }

    public void start() {
        if (!connector.isEnabled()) {
            LOGGER.warn("MQTT not enabled, skipping emulator provisioning subscriber");
            return;
        }

        connector.registerHandler(this::onMessage);
        connector.subscribe(MqttTopics.EMULATOR_PROVISION_TOPIC, MqttTopics.COMMAND_QOS);
        LOGGER.info("Subscribed to emulator provisioning commands: {}", MqttTopics.EMULATOR_PROVISION_TOPIC);
    }

    public void stop() {
        // MQTTConnector owns the connection lifecycle.
    }

    public void onMessage(String topic, byte[] payload) {
        if (!MqttTopics.isEmulatorProvisionTopic(topic)) {
            return;
        }

        String raw = new String(payload, StandardCharsets.UTF_8);
        try {
            ProvisionCommand command = parse(raw);
            provision(command);
        } catch (RuntimeException | IOException ex) {
            LOGGER.warn("emulator.provision.failed topic={} cause={}", topic, ex.getMessage());
            LOGGER.debug("emulator.provision.failed payload={}", raw, ex);
            logStore.onEvent("provision", "emulator.provision.failed", ex.getMessage());
        }
    }

    private void provision(ProvisionCommand command) {
        logStore.onEvent(command.emulatorExternalId(), "emulator.provision.received",
                "Provision command received for room " + command.roomId());

        Emulator existing = emulatorManager.getEmulator(command.emulatorExternalId());
        if (existing != null) {
            logStore.onEvent(command.emulatorExternalId(), "emulator.provision.already-exists",
                    "Provision command ignored because emulator already exists");
            LOGGER.info("emulator.provision.already-exists emulatorExternalId={} roomId={}",
                    command.emulatorExternalId(),
                    command.roomId());
            existing.emitTelemetryNow();
            return;
        }

        Emulator emulator = new Emulator(command.emulatorExternalId(), telemetryQueue, logStore);
        emulator.applySetup(command.setup());
        emulatorManager.addEmulator(emulator);
        emulator.start();
        emulator.emitTelemetryNow();

        logStore.onEvent(command.emulatorExternalId(), "emulator.provision.created",
                "Provisioned emulator for room " + command.roomId());
        LOGGER.info("emulator.provision.created emulatorExternalId={} roomId={}",
                command.emulatorExternalId(),
                command.roomId());
    }

    private ProvisionCommand parse(String raw) throws IOException {
        JsonNode root = JSON.readTree(raw);
        String type = text(root, "type");
        if (!"PROVISION_EMULATOR".equals(type)) {
            throw new IllegalArgumentException("Unsupported provision command type: " + type);
        }

        String emulatorExternalId = text(root, "emulatorExternalId");
        if (emulatorExternalId == null || emulatorExternalId.isBlank()) {
            throw new IllegalArgumentException("emulatorExternalId is required");
        }

        String roomId = text(root, "roomId");
        JsonNode config = root.path("config");
        DtoSetup setup = new DtoSetup(
                emulatorExternalId,
                intValue(config, "updateIntervalSec", DEFAULT_UPDATE_INTERVAL_SEC),
                intValue(config, "roomSquareMeters", DEFAULT_ROOM_SQUARE_METERS),
                intValue(config, "windowCount", DEFAULT_WINDOW_COUNT),
                intArray(config, "sensorTypes", DEFAULT_SENSOR_TYPES),
                intArray(config, "deviceTypes", DEFAULT_DEVICE_TYPES));

        return new ProvisionCommand(emulatorExternalId, roomId, setup);
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? null : value.asText();
    }

    private int intValue(JsonNode node, String field, int fallback) {
        JsonNode value = node.get(field);
        return value == null || !value.canConvertToInt() ? fallback : value.asInt();
    }

    private int[] intArray(JsonNode node, String field, int[] fallback) {
        JsonNode value = node.get(field);
        if (value == null || !value.isArray()) {
            return fallback.clone();
        }

        List<Integer> values = new ArrayList<>();
        value.forEach(item -> {
            if (item.canConvertToInt()) {
                values.add(item.asInt());
            }
        });
        if (values.isEmpty()) {
            return fallback.clone();
        }

        int[] result = new int[values.size()];
        for (int index = 0; index < values.size(); index += 1) {
            result[index] = values.get(index);
        }
        return result;
    }

    private record ProvisionCommand(String emulatorExternalId, String roomId, DtoSetup setup) {}
}
