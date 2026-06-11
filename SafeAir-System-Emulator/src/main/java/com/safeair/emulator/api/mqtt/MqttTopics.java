package com.safeair.emulator.api.mqtt;

public final class MqttTopics {
    public static final String TELEMETRY_TEMPLATE = "safeair/%s/telemetry";
    public static final String EMULATOR_CONFIG_TEMPLATE = "safeair/%s/config";
    public static final String ACTUATOR_STATE_TEMPLATE = "safeair/%s/actuator-state";
    public static final String EMULATOR_COMMANDS_TEMPLATE = "safeair/%s/commands";
    public static final String EMULATOR_SCENARIO_TEMPLATE = "safeair/%s/scenario";
    public static final String GLOBAL_CONFIG_TOPIC = "safeair/config";
    public static final String EMULATOR_CONFIG_WILDCARD = "safeair/+/config";
    public static final String ACTUATOR_STATE_WILDCARD = "safeair/+/actuator-state";
    public static final String EMULATOR_COMMANDS_WILDCARD = "safeair/+/commands";
    public static final String EMULATOR_SCENARIO_WILDCARD = "safeair/+/scenario";

    public static final int TELEMETRY_QOS = 0;
    public static final int CONFIG_QOS = 1;
    public static final int ACTUATOR_QOS = 1;
    public static final int COMMAND_QOS = 1;

    private MqttTopics() {}

    public static String telemetryTopic(String emulatorId) {
        return TELEMETRY_TEMPLATE.formatted(emulatorId);
    }

    public static String emulatorConfigTopic(String emulatorId) {
        return EMULATOR_CONFIG_TEMPLATE.formatted(emulatorId);
    }

    public static String actuatorStateTopic(String emulatorId) {
        return ACTUATOR_STATE_TEMPLATE.formatted(emulatorId);
    }

    public static String emulatorCommandsTopic(String emulatorId) {
        return EMULATOR_COMMANDS_TEMPLATE.formatted(emulatorId);
    }

    public static String emulatorScenarioTopic(String emulatorId) {
        return EMULATOR_SCENARIO_TEMPLATE.formatted(emulatorId);
    }

    public static boolean isGlobalConfigTopic(String topic) {
        return GLOBAL_CONFIG_TOPIC.equals(topic);
    }
}
