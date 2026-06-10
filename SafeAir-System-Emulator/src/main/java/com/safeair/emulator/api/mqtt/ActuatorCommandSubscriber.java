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
            public void onCommand(String emulatorId, String deviceType, int deviceIndex, String action, Object value) {
                processCommand(emulatorId, deviceType, deviceIndex, action, value);
            }
        });
        
        // Register message handler with connector
        connector.registerHandler(handler::onMessage);
        
        // Subscribe to actuator state topic (wildcard for all emulators)
        connector.subscribe(MqttTopics.ACTUATOR_STATE_WILDCARD, MqttTopics.ACTUATOR_QOS);
        LOGGER.info("Subscribed to actuator commands: {}", MqttTopics.ACTUATOR_STATE_WILDCARD);
    }

    public void stop() {
        // MQTTConnector owns the actual connection lifecycle.
    }
    
    private void processCommand(String emulatorId, String deviceType, int deviceIndex, String action, Object value) {
        LOGGER.info("Processing command: {} #{} {} -> {} for emulator {}", deviceType, deviceIndex, action, value, emulatorId);
        
        Emulator emulator = emulatorManager.getEmulator(emulatorId);
        if (emulator == null) {
            LOGGER.warn("Emulator not found: {}", emulatorId);
            return;
        }
        
        // Apply command to device
        try {
            Electrodomestic device = applyDeviceCommand(emulator, deviceType, deviceIndex, action, value);
            
            // Publish confirmation/state update
            publishStateUpdate(emulatorId, deviceType, deviceIndex, device);
            
        } catch (Exception e) {
            LOGGER.error("Failed to apply command to device", e);
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
}
