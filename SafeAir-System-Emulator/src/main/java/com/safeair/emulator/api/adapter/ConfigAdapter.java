package com.safeair.emulator.api.adapter;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import com.google.protobuf.InvalidProtocolBufferException;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.proto.ConfigProto;

/** Adapter for converting Protobuf config messages to domain objects. */
public class ConfigAdapter {

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
      throw new IllegalArgumentException("Invalid Protobuf config payload", e);
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
}
