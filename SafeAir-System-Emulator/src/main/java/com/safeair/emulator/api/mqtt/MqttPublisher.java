package com.safeair.emulator.api.mqtt;

import java.nio.charset.StandardCharsets;
import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.emulation.core.TelemetryPayload;

/**
 * MQTT publisher for telemetry and configuration messages.
 * Implements SendInfo interface for telemetry dispatching.
 */
public class MqttPublisher extends SendInfo implements Subject {
  private final MQTTConnector connector;
  private final TelemetryAdapter telemetryAdapter;

  public MqttPublisher() {
    this.connector = null;
    this.telemetryAdapter = null;
  }

  public MqttPublisher(MQTTConnector connector, TelemetryAdapter telemetryAdapter) {
    this.connector = connector;
    this.telemetryAdapter = telemetryAdapter;
  }

  @Override
  public void send(Object data) {
    if (data instanceof TelemetryPayload payload && telemetryAdapter != null) {
      publish(MqttTopics.telemetryTopic(payload.emulatorId()),
          telemetryAdapter.toProtobuf(payload));
      return;
    }
    publish("safeair/telemetry", data);
  }

  @Override
  public void publish(String topic, Object payload) {
    if (connector == null) {
      return;
    }

    byte[] bytes;
    if (payload instanceof byte[] payloadBytes) {
      bytes = payloadBytes;
    } else if (payload != null) {
      bytes = payload.toString().getBytes(StandardCharsets.UTF_8);
    } else {
      bytes = new byte[0];
    }

    int qos = topic.endsWith("/telemetry")
        ? MqttTopics.TELEMETRY_QOS
        : MqttTopics.CONFIG_QOS;
    connector.publish(topic, bytes, qos);
  }
}
