package com.safeair.emulator.api.mqtt;

public final class MqttTopics {
    public static final String TELEMETRY_TEMPLATE = "safeair/%s/telemetry";
    public static final String EMULATOR_CONFIG_TEMPLATE = "safeair/%s/config";
    public static final String GLOBAL_CONFIG_TOPIC = "safeair/config";
    public static final String EMULATOR_CONFIG_WILDCARD = "safeair/+/config";

    public static final int TELEMETRY_QOS = 0;
    public static final int CONFIG_QOS = 1;

    private MqttTopics() {}

    public static String telemetryTopic(String emulatorId) {
        return TELEMETRY_TEMPLATE.formatted(emulatorId);
    }

    public static String emulatorConfigTopic(String emulatorId) {
        return EMULATOR_CONFIG_TEMPLATE.formatted(emulatorId);
    }

    public static boolean isGlobalConfigTopic(String topic) {
        return GLOBAL_CONFIG_TOPIC.equals(topic);
    }
}
