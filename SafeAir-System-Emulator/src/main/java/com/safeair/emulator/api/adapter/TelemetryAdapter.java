package com.safeair.emulator.api.adapter;

import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.safeair.emulator.api.proto.TelemetryProto;
import com.safeair.emulator.emulation.core.DeviceState;
import com.safeair.emulator.emulation.core.TelemetryPayload;

/** Adapter for converting TelemetryPayload to Protobuf messages. */
public class TelemetryAdapter {
  private static final Pattern DEVICE_INDEX_PATTERN = Pattern.compile("^(.*)#(\\d+)$");

  /**
   * Convert TelemetryPayload to Protobuf bytes.
   * @param payload telemetry data
   * @return protobuf bytes
   */
  public byte[] toProtobuf(TelemetryPayload payload) {
    return toMessage(payload).toByteArray();
  }

  /**
   * Convert TelemetryPayload to Protobuf TelemetryMessage.
   * @param payload telemetry data
   * @return protobuf message
   */
  public TelemetryProto.TelemetryMessage toMessage(TelemetryPayload payload) {
    TelemetryProto.TelemetryMessage.Builder builder =
        TelemetryProto.TelemetryMessage.newBuilder()
            .setMessageId(UUID.randomUUID().toString())
            .setEmulatorId(payload.emulatorId())
            .setEventTimestampEpochMs(payload.timestamp().toEpochMilli())
            .setTickDurationMs(payload.tickDurationMs())
            .setQueueSize(payload.queueSize())
            .setActiveEmulatorCount(payload.activeEmulatorCount())
            .setDroppedTelemetryCount(payload.droppedTelemetryCount());

    for (Map.Entry<String, Double> sensor : payload.sensors().entrySet()) {
      builder.addSensors(
          TelemetryProto.SensorValue.newBuilder()
              .setName(sensor.getKey())
              .setValue(sensor.getValue())
              .build());
    }

    for (Map.Entry<String, DeviceState> device : payload.devices().entrySet()) {
      ParsedDeviceKey parsedKey = parseDeviceKey(device.getKey());
      TelemetryProto.DeviceStateMessage.Builder deviceBuilder =
          TelemetryProto.DeviceStateMessage.newBuilder()
              .setDeviceType(parsedKey.deviceType())
              .setDeviceIndex(parsedKey.deviceIndex())
              .setOn(device.getValue().isOn());
      for (Map.Entry<String, Integer> attr : device.getValue().attributes().entrySet()) {
        deviceBuilder.addAttributes(
            TelemetryProto.DeviceAttribute.newBuilder()
                .setKey(attr.getKey())
                .setValue(attr.getValue())
                .build());
      }
      builder.addDevices(deviceBuilder.build());
    }

    builder.setRoomState(
        TelemetryProto.RoomStateMessage.newBuilder()
            .setTemperatureC(payload.roomState().temperature())
            .setHumidityPct(payload.roomState().humidity())
            .setCo2Ppm(payload.roomState().co2())
            .setPm25UgM3(payload.roomState().pm25())
            .setDispersionRate(payload.roomState().dispersionRate())
            .setRoomSquareMeters(payload.roomState().area())
            .setWindowCount(payload.roomState().windows())
            .build());

    return builder.build();
  }

  private ParsedDeviceKey parseDeviceKey(String rawKey) {
    Matcher matcher = DEVICE_INDEX_PATTERN.matcher(rawKey);
    if (matcher.matches()) {
      return new ParsedDeviceKey(matcher.group(1), Integer.parseInt(matcher.group(2)));
    }

    return new ParsedDeviceKey(rawKey, 1);
  }

  private record ParsedDeviceKey(String deviceType, int deviceIndex) {}
}
