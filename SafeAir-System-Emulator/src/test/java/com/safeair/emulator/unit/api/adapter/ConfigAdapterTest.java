package com.safeair.emulator.unit.api.adapter;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.ConfigAdapter;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.proto.ConfigProto;

class ConfigAdapterTest {

    @Test
    void toCommand_mapsProtobufToDomain() {
        ConfigProto.ConfigCommandMessage msg = ConfigProto.ConfigCommandMessage.newBuilder()
                .setCommandId("cmd-1")
                .setScope(ConfigProto.ConfigCommandMessage.Scope.EMULATOR)
                .setTargetEmulatorId("EMU-0001")
                .setReceivedAtEpochMs(1710000000123L)
                .setSequence(9)
                .addPayload(ConfigProto.ConfigEntry.newBuilder().setKey("minisplitState").setValue("25").build())
                .build();

        ConfigAdapter adapter = new ConfigAdapter();
        ConfigCommand command = adapter.toCommand(msg.toByteArray());

        assertEquals("cmd-1", command.commandId());
        assertEquals(ConfigCommand.Scope.EMULATOR, command.scope());
        assertEquals("EMU-0001", command.targetEmulatorId());
        assertEquals(9L, command.sequence());
        assertEquals(Map.of("minisplitState", "25"), command.payload());
    }

    @Test
    void toCommand_invalidPayload_throws() {
        ConfigAdapter adapter = new ConfigAdapter();
        IllegalArgumentException thrown =
                assertThrows(IllegalArgumentException.class, () -> adapter.toCommand(new byte[] {1, 2, 3}));
        assertEquals("Invalid Protobuf config payload", thrown.getMessage());
    }
}
