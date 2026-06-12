package com.safeair.emulator.api.mqtt;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.emulation.core.TelemetryPayload;

/**
 * MQTT publisher for telemetry and configuration messages.
 * Implements SendInfo interface for telemetry dispatching.
 */
public class MqttPublisher extends SendInfo implements Subject {
  private static final Logger LOGGER = LoggerFactory.getLogger(MqttPublisher.class);
  private static final long WARNING_INTERVAL_MS = TimeUnit.SECONDS.toMillis(30);

  private final MQTTConnector connector;
  private final TelemetryAdapter telemetryAdapter;
  private final AtomicLong lastWarningAt = new AtomicLong(0);

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
      String topic = MqttTopics.telemetryTopic(payload.emulatorId());
      LOGGER.debug("Publishing telemetry to topic {}", topic);
      publish(topic, telemetryAdapter.toProtobuf(payload));
      return;
    }
    publish("safeair/telemetry", data);
  }

  @Override
  public void publish(String topic, Object payload) {
    if (connector == null) {
      LOGGER.warn("MQTT publish skipped because publisher has no connector topic={}", topic);
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
    boolean published = connector.publish(topic, bytes, qos);
    if (published) {
      if (topic.endsWith("/telemetry")) {
        LOGGER.debug("Published telemetry successfully topic={} broker={}", topic, connector.brokerUrl());
      } else {
        LOGGER.debug("Published MQTT message successfully topic={} broker={}", topic, connector.brokerUrl());
      }
    } else {
      warnRateLimited("MQTT publish not completed topic=" + topic + " broker=" + connector.brokerUrl());
    }
  }

  private void warnRateLimited(String message) {
    long now = System.currentTimeMillis();
    long previous = lastWarningAt.get();
    if (now - previous < WARNING_INTERVAL_MS || !lastWarningAt.compareAndSet(previous, now)) {
      LOGGER.debug(message);
      return;
    }

    LOGGER.warn(message);
  }
}
