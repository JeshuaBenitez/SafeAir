package com.safeair.emulator.unit.manager;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;

class ConfigDispatcherTest {

    @Test
    void enqueue_whenOverflow_dropsOldest() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        ConfigDispatcher dispatcher = new ConfigDispatcher(manager);

        for (int i = 0; i < 1026; i++) {
            dispatcher.enqueue(new ConfigCommand(
                    "cmd-" + i,
                    ConfigCommand.Scope.EMULATOR,
                    "EMU-" + i,
                    Instant.now(),
                    i,
                    Map.of("minisplitState", "24")));
        }

        assertEquals(2L, dispatcher.droppedCount());
        assertEquals(1024, dispatcher.size());
    }

    @Test
    void poll_returnsCommand_whenPresent() throws Exception {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        ConfigDispatcher dispatcher = new ConfigDispatcher(manager);
        dispatcher.enqueue(command(1));

        ConfigCommand result = dispatcher.poll(50);

        assertNotNull(result);
        assertEquals("cmd-1", result.commandId());
    }

    @Test
    void enqueue_specificCommand_removesPendingGlobal() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        ConfigDispatcher dispatcher = new ConfigDispatcher(manager);

        dispatcher.enqueue(command(1));
        dispatcher.enqueue(new ConfigCommand(
                "cmd-specific",
                ConfigCommand.Scope.EMULATOR,
                "EMU-0001",
                Instant.now(),
                2,
                Map.of("minisplitState", "24")));

        assertEquals(1, dispatcher.size());
    }

    @Test
    void enqueue_sameScopeTarget_keepsOnlyNewestPendingCommand() throws Exception {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        ConfigDispatcher dispatcher = new ConfigDispatcher(manager);

        dispatcher.enqueue(new ConfigCommand(
                "cmd-a",
                ConfigCommand.Scope.EMULATOR,
                "EMU-0001",
                Instant.now(),
                1,
                Map.of("minisplitState", "22")));
        dispatcher.enqueue(new ConfigCommand(
                "cmd-b",
                ConfigCommand.Scope.EMULATOR,
                "EMU-0001",
                Instant.now(),
                2,
                Map.of("minisplitState", "24")));

        assertEquals(1, dispatcher.size());
        ConfigCommand result = dispatcher.poll(50);
        assertNotNull(result);
        assertEquals("cmd-b", result.commandId());
    }

    private ConfigCommand command(int i) {
        return new ConfigCommand(
                "cmd-" + i,
                ConfigCommand.Scope.GLOBAL,
                null,
                Instant.now(),
                i,
                Map.of("minisplitState", "24"));
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
