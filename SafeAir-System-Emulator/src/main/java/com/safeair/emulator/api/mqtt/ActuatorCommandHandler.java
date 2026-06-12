package com.safeair.emulator.api.mqtt;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Handler for actuator commands received via MQTT.
 * Commands come from API via: safeair/{emulatorId}/actuator-state
 * 
 * Expected JSON format:
 * {
 *   "roomId": "...",
 *   "deviceType": "minisplit" | "purifier" | "extractor",
 *   "deviceIndex": 1,
 *   "action": "turn_on" | "turn_off" | "set_temperature",
 *   "value": true | false | number,
 *   "source": "frontend",
 *   "timestamp": "..."
 * }
 */
public class ActuatorCommandHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(ActuatorCommandHandler.class);
    
    private final EmulatorCommandCallback callback;
    
    public interface EmulatorCommandCallback {
        void onCommand(String emulatorId, String deviceType, int deviceIndex, String action, Object value, String correlationId);
    }
    
    public ActuatorCommandHandler(EmulatorCommandCallback callback) {
        this.callback = callback;
    }
    
    /**
     * Process incoming actuator command message
     */
    public void onMessage(String topic, byte[] payload) {
        if (!isActuatorStateTopic(topic)) {
            return;
        }

        try {
            String json = new String(payload, java.nio.charset.StandardCharsets.UTF_8);
            LOGGER.info("Received actuator command on topic {}: {}", topic, json);
            
            // Parse topic to get emulatorId (format: safeair/{emulatorId}/actuator-state)
            String[] parts = topic.split("/");
            if (parts.length < 3) {
                LOGGER.warn("Invalid actuator topic format: {}", topic);
                return;
            }
            
            String emulatorId = parts[1];
            
            // Parse JSON (simple parsing without external library)
            String correlationId = extractJsonField(json, "correlationId");
            String deviceType = extractJsonField(json, "deviceType");
            if (deviceType == null) {
                deviceType = extractJsonField(json, "device");
            }
            int deviceIndex = parseDeviceIndex(extractJsonField(json, "deviceIndex"));
            String action = extractJsonField(json, "action");
            String valueStr = extractJsonField(json, "value");
            
            if (action == null && extractJsonField(json, "isOn") != null) {
                return;
            }

            if (deviceType == null || action == null) {
                LOGGER.warn("Missing deviceType or action in payload: {}", json);
                return;
            }
            
            // Determine value type
            Object value = null;
            if ("true".equals(valueStr) || "false".equals(valueStr)) {
                value = Boolean.parseBoolean(valueStr);
            } else if (valueStr != null && valueStr.matches("\\d+")) {
                value = Integer.parseInt(valueStr);
            } else if (valueStr != null) {
                value = valueStr;
            }
            
            // Process action
            processAction(emulatorId, deviceType, deviceIndex, action, value, correlationId);
            
        } catch (Exception ex) {
            LOGGER.error("Failed to process actuator command", ex);
        }
    }
    
    private void processAction(String emulatorId, String deviceType, int deviceIndex, String action, Object value, String correlationId) {
        // Map action string to command
        if ("turn_on".equals(action) || action.endsWith("_on")) {
            // Turn on command
            LOGGER.info("Command: Turn ON {} unit {} for emulator {}", deviceType, deviceIndex, emulatorId);
            if (callback != null) {
                callback.onCommand(emulatorId, deviceType, deviceIndex, "turn_on", true, correlationId);
            }
        } else if ("turn_off".equals(action) || action.endsWith("_off")) {
            // Turn off command
            LOGGER.info("Command: Turn OFF {} unit {} for emulator {}", deviceType, deviceIndex, emulatorId);
            if (callback != null) {
                callback.onCommand(emulatorId, deviceType, deviceIndex, "turn_off", false, correlationId);
            }
        } else if ("set_temperature".equals(action) && value instanceof Integer) {
            LOGGER.info("Command: Set {} unit {} temperature to {} for emulator {}", deviceType, deviceIndex, value, emulatorId);
            if (callback != null) {
                callback.onCommand(emulatorId, deviceType, deviceIndex, "set_temperature", value, correlationId);
            }
        } else if ("set_speed".equals(action) && value instanceof Integer) {
            LOGGER.info("Command: Set {} unit {} speed to {} for emulator {}", deviceType, deviceIndex, value, emulatorId);
            if (callback != null) {
                callback.onCommand(emulatorId, deviceType, deviceIndex, "set_speed", value, correlationId);
            }
        } else if ("set_mode".equals(action) && value instanceof String) {
            LOGGER.info("Command: Set {} unit {} mode to {} for emulator {}", deviceType, deviceIndex, value, emulatorId);
            if (callback != null) {
                callback.onCommand(emulatorId, deviceType, deviceIndex, "set_mode", value, correlationId);
            }
        } else if (action.contains("_set_")) {
            // Set temperature command
            String[] parts = action.split("_set_");
            if (parts.length == 2) {
                int temp = Integer.parseInt(parts[1]);
                LOGGER.info("Command: Set {} unit {} temperature to {} for emulator {}", deviceType, deviceIndex, temp, emulatorId);
                if (callback != null) {
                    callback.onCommand(emulatorId, deviceType, deviceIndex, "set_temperature", temp, correlationId);
                }
            }
        } else {
            LOGGER.warn("Unknown action: {} for device {}", action, deviceType);
        }
    }

    private int parseDeviceIndex(String raw) {
        try {
            int parsed = raw == null ? 1 : Integer.parseInt(raw);
            return parsed >= 1 && parsed <= 3 ? parsed : 1;
        } catch (NumberFormatException ex) {
            return 1;
        }
    }
    
    private String extractJsonField(String json, String field) {
        try {
            String search = "\"" + field + "\"";
            int idx = json.indexOf(search);
            if (idx == -1) return null;
            
            int colonIdx = json.indexOf(":", idx);
            if (colonIdx == -1) return null;
            
            int start = colonIdx + 1;
            while (start < json.length() && (json.charAt(start) == ' ' || json.charAt(start) == '\t')) start++;
            
            if (start >= json.length()) return null;
            
            char firstChar = json.charAt(start);
            if (firstChar == '"') {
                // String value
                int end = json.indexOf("\"", start + 1);
                return json.substring(start + 1, end);
            } else if (firstChar == 't' || firstChar == 'f') {
                // Boolean
                int end = json.indexOf(",", start);
                if (end == -1) end = json.indexOf("}", start);
                return json.substring(start, end).trim();
            } else {
                // Number
                int end = start;
                while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '.')) end++;
                return json.substring(start, end).trim();
            }
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isActuatorStateTopic(String topic) {
        String[] parts = topic.split("/");
        return parts.length == 3 && "safeair".equals(parts[0]) && "actuator-state".equals(parts[2]);
    }
}
