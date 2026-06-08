package com.safeair.emulator.api.adapter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.InvalidProtocolBufferException;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.proto.ConfigProto;

/** Adapter for converting Protobuf config messages to domain objects. */
public class ConfigAdapter {
  private static final ObjectMapper JSON = new ObjectMapper();

  /**
   * Convert raw Protobuf bytes to ConfigCommand.
   * @param payload raw protobuf bytes
   * @return ConfigCommand domain object
   */
  public ConfigCommand toCommand(byte[] payload) {
    try {
      ConfigProto.ConfigCommandMessage msg =
          ConfigProto.ConfigCommandMessage.parseFrom(payload);
      return fromMessage(msg);
    } catch (InvalidProtocolBufferException e) {
      return fromJson(payload, e);
    }
  }

  /**
   * Convert Protobuf message to ConfigCommand.
   * @param msg Protobuf message
   * @return ConfigCommand domain object
   */
  public ConfigCommand fromMessage(ConfigProto.ConfigCommandMessage msg) {
    ConfigCommand.Scope scope = msg.getScope() == ConfigProto.ConfigCommandMessage.Scope.EMULATOR
        ? ConfigCommand.Scope.EMULATOR
        : ConfigCommand.Scope.GLOBAL;

    Map<String, String> payloadMap = new HashMap<>();
    for (ConfigProto.ConfigEntry entry : msg.getPayloadList()) {
      payloadMap.put(entry.getKey(), entry.getValue());
    }

    return new ConfigCommand(
        msg.getCommandId(),
        scope,
        msg.getTargetEmulatorId(),
        Instant.ofEpochMilli(msg.getReceivedAtEpochMs()),
        msg.getSequence(),
        payloadMap);
  }

  private ConfigCommand fromJson(byte[] payload, Exception protobufError) {
    try {
      Map<String, Object> raw = JSON.readValue(payload, new TypeReference<Map<String, Object>>() {});
      Map<String, String> payloadMap = new HashMap<>();
      raw.forEach((key, value) -> {
        if (value != null) {
          payloadMap.put(key, String.valueOf(value));
        }
      });

      String targetEmulatorId = payloadMap.get("targetEmulatorId");
      ConfigCommand.Scope scope = targetEmulatorId == null || targetEmulatorId.isBlank()
          ? ConfigCommand.Scope.GLOBAL
          : ConfigCommand.Scope.EMULATOR;

      return new ConfigCommand(
          payloadMap.get("commandId"),
          scope,
          targetEmulatorId,
          parseReceivedAt(payloadMap.get("sentAt")),
          parseSequence(payloadMap.get("sequence")),
          payloadMap);
    } catch (Exception jsonError) {
      throw new IllegalArgumentException("Invalid Protobuf or JSON config payload", protobufError);
    }
  }

  private Instant parseReceivedAt(String sentAt) {
    if (sentAt == null || sentAt.isBlank()) {
      return Instant.now();
    }

    try {
      return Instant.parse(sentAt);
    } catch (Exception ignored) {
      return Instant.now();
    }
  }

  private long parseSequence(String sequence) {
    if (sequence == null || sequence.isBlank()) {
      return 0L;
    }

    try {
      return Long.parseLong(sequence);
    } catch (NumberFormatException ignored) {
      return 0L;
    }
  }
}
