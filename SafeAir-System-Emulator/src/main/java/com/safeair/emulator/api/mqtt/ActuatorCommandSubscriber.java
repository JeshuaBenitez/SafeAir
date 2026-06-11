package com.safeair.emulator.api.mqtt;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.emulation.impl.MiniSplit;
import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.core.Emulator;

/**
 * Subscriber for actuator commands from MQTT.
 * Listens to: safeair/+/actuator-state
 */
public class ActuatorCommandSubscriber {
    private static final Logger LOGGER = LoggerFactory.getLogger(ActuatorCommandSubscriber.class);
    
    private final MQTTConnector connector;
    private final EmulatorManager emulatorManager;
    private final MqttPublisher publisher;
    private ActuatorCommandHandler handler;
    
    public ActuatorCommandSubscriber(MQTTConnector connector, EmulatorManager emulatorManager, MqttPublisher publisher) {
        this.connector = connector;
        this.emulatorManager = emulatorManager;
        this.publisher = publisher;
    }
    
    public void start() {
        if (!connector.isEnabled()) {
            LOGGER.warn("MQTT not enabled, skipping actuator command subscriber");
            return;
        }
        
        // Create handler with callback to emulator manager
        handler = new ActuatorCommandHandler(new ActuatorCommandHandler.EmulatorCommandCallback() {
            @Override
            public void onCommand(String emulatorId, String deviceType, int deviceIndex, String action, Object value, String correlationId) {
                processCommand(emulatorId, deviceType, deviceIndex, action, value, correlationId);
            }
        });
        
        // Register message handler with connector
        connector.registerHandler(handler::onMessage);
        connector.registerHandler(this::onBehaviorMessage);
        
        // Subscribe to actuator and behavior topics (wildcard for all emulators)
        connector.subscribe(MqttTopics.ACTUATOR_STATE_WILDCARD, MqttTopics.ACTUATOR_QOS);
        connector.subscribe(MqttTopics.EMULATOR_COMMANDS_WILDCARD, MqttTopics.COMMAND_QOS);
        connector.subscribe(MqttTopics.EMULATOR_SCENARIO_WILDCARD, MqttTopics.COMMAND_QOS);
        LOGGER.info("Subscribed to actuator commands: {}", MqttTopics.ACTUATOR_STATE_WILDCARD);
        LOGGER.info("Subscribed to emulator behavior commands: {}", MqttTopics.EMULATOR_COMMANDS_WILDCARD);
        LOGGER.info("Subscribed to emulator scenarios: {}", MqttTopics.EMULATOR_SCENARIO_WILDCARD);
    }

    public void stop() {
        // MQTTConnector owns the actual connection lifecycle.
    }
    
    private void processCommand(String emulatorId, String deviceType, int deviceIndex, String action, Object value, String correlationId) {
        LOGGER.info(
                "[{}] MQTT actuator command received action={} device={}#{} value={} correlationId={}",
                emulatorId,
                action,
                deviceType,
                deviceIndex,
                value,
                correlationId);
        
        Emulator emulator = emulatorManager.getEmulator(emulatorId);
        if (emulator == null) {
            LOGGER.warn("[{}] MQTT actuator command result=emulator_not_found correlationId={}", emulatorId, correlationId);
            return;
        }
        
        // Apply command to device
        try {
            Electrodomestic device = applyDeviceCommand(emulator, deviceType, deviceIndex, action, value);
            
            // Publish confirmation/state update
            publishStateUpdate(emulatorId, deviceType, deviceIndex, device);
            emulator.emitTelemetryNow();
            LOGGER.info("[{}] MQTT actuator command applied action={} correlationId={} result=ok", emulatorId, action, correlationId);
            
        } catch (Exception e) {
            LOGGER.error("[{}] MQTT actuator command failed action={} correlationId={} result=error", emulatorId, action, correlationId, e);
        }
    }

    private void onBehaviorMessage(String topic, byte[] payload) {
        if (!isCommandsTopic(topic) && !isScenarioTopic(topic)) {
            return;
        }

        String json = new String(payload, java.nio.charset.StandardCharsets.UTF_8);
        String emulatorId = extractEmulatorId(topic);
        String correlationId = extractJsonField(json, "correlationId");
        Emulator emulator = emulatorManager.getEmulator(emulatorId);
        if (emulator == null) {
            LOGGER.warn("[{}] MQTT behavior message topic={} correlationId={} result=emulator_not_found", emulatorId, topic, correlationId);
            return;
        }

        try {
            if (isScenarioTopic(topic)) {
                String scenario = extractJsonField(json, "scenario");
                String result = emulator.applyScenario(scenario);
                emulator.emitTelemetryNow();
                LOGGER.info("[{}] MQTT scenario received topic={} scenario={} correlationId={} result={}", emulatorId, topic, scenario, correlationId, result);
                return;
            }

            String action = extractJsonField(json, "action");
            String value = extractJsonField(json, "value");
            String result = emulator.applyBehaviorCommand(action, value);
            emulator.emitTelemetryNow();
            LOGGER.info("[{}] MQTT command received topic={} action={} value={} correlationId={} result={}", emulatorId, topic, action, value, correlationId, result);
        } catch (Exception ex) {
            LOGGER.error("[{}] MQTT behavior command failed topic={} correlationId={} result=error", emulatorId, topic, correlationId, ex);
        }
    }
    
    private Electrodomestic applyDeviceCommand(Emulator emulator, String deviceType, int deviceIndex, String command, Object value) {
        int currentIndex = 0;

        // Find Nth device by type in emulator's electrodomestics list
        for (Electrodomestic device : emulator.getElectrodomestics()) {
            String type = device.getType().toLowerCase();
            
            if (type.contains(deviceType.toLowerCase()) || 
                (deviceType.equalsIgnoreCase("purifier") && type.equals("humidifierpurifier")) ||
                (deviceType.equalsIgnoreCase("extractor") && type.equals("airextractor"))) {
                currentIndex++;
                if (currentIndex != deviceIndex) {
                    continue;
                }
                
                if ("turn_on".equals(command)) {
                    // Use toggle to turn on (if off, turns on; if on, turns off)
                    if (!device.isOn()) {
                        device.toggle();
                    }
                    LOGGER.info("{} unit {} turned ON for emulator {}", device.getType(), deviceIndex, emulator.emulatorId());
                } else if ("turn_off".equals(command)) {
                    // Use toggle to turn off (if on, turns off)
                    if (device.isOn()) {
                        device.toggle();
                    }
                    LOGGER.info("{} unit {} turned OFF for emulator {}", device.getType(), deviceIndex, emulator.emulatorId());
                } else if ("set_temperature".equals(command) && value instanceof Integer && device instanceof MiniSplit) {
                    ((MiniSplit) device).setState((Integer) value);
                    LOGGER.info("{} unit {} temperature set to {} for emulator {}", device.getType(), deviceIndex, value, emulator.emulatorId());
                } else if ("set_speed".equals(command) && value instanceof Integer) {
                    if (device instanceof MiniSplit) {
                        if (!device.isOn()) {
                            device.toggle();
                        }
                    } else {
                        device.setState((Integer) value);
                    }
                    LOGGER.info("{} unit {} speed/state set to {} for emulator {}", device.getType(), deviceIndex, value, emulator.emulatorId());
                } else if ("set_mode".equals(command) && value instanceof String) {
                    boolean shouldBeOn = !"off".equalsIgnoreCase((String) value);
                    if (shouldBeOn && !device.isOn()) {
                        device.toggle();
                    } else if (!shouldBeOn && device.isOn()) {
                        device.toggle();
                    }
                    LOGGER.info("{} unit {} mode set to {} for emulator {}", device.getType(), deviceIndex, value, emulator.emulatorId());
                }
                
                return device; // Device found and processed
            }
        }
        
        LOGGER.warn("Device type {} unit {} not found in emulator {}", deviceType, deviceIndex, emulator.emulatorId());
        return null;
    }
    
    private void publishStateUpdate(String emulatorId, String deviceType, int deviceIndex, Electrodomestic device) {
        try {
            if (device != null && publisher != null) {
                String payload = "{"
                        + "\"emulatorId\":\"" + emulatorId + "\","
                        + "\"deviceType\":\"" + deviceType + "\","
                        + "\"deviceIndex\":" + deviceIndex + ","
                        + "\"isOn\":" + device.isOn() + ","
                        + "\"targetTemperature\":" + device.getNormalizedState() + ","
                        + "\"timestamp\":\"" + Instant.now().toString() + "\""
                        + "}";
                publisher.publish(MqttTopics.actuatorStateTopic(emulatorId), payload);
                LOGGER.debug("Published actuator state update for emulator {} {} #{}", emulatorId, deviceType, deviceIndex);
            }
        } catch (Exception e) {
            LOGGER.error("Failed to publish state update", e);
        }
    }

    private boolean isCommandsTopic(String topic) {
        String[] parts = topic.split("/");
        return parts.length == 3 && "safeair".equals(parts[0]) && "commands".equals(parts[2]);
    }

    private boolean isScenarioTopic(String topic) {
        String[] parts = topic.split("/");
        return parts.length == 3 && "safeair".equals(parts[0]) && "scenario".equals(parts[2]);
    }

    private String extractEmulatorId(String topic) {
        String[] parts = topic.split("/");
        return parts.length >= 2 ? parts[1] : "";
    }

    private String extractJsonField(String json, String field) {
        try {
            String search = "\"" + field + "\"";
            int idx = json.indexOf(search);
            if (idx == -1) return null;

            int colonIdx = json.indexOf(":", idx);
            if (colonIdx == -1) return null;

            int start = colonIdx + 1;
            while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
            if (start >= json.length()) return null;

            char firstChar = json.charAt(start);
            if (firstChar == '"') {
                int end = json.indexOf("\"", start + 1);
                return end >= 0 ? json.substring(start + 1, end) : null;
            }

            int end = start;
            while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}') end++;
            return json.substring(start, end).trim();
        } catch (Exception e) {
            return null;
        }
    }
}
