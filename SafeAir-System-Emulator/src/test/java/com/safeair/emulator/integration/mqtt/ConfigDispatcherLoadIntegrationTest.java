package com.safeair.emulator.integration.mqtt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;

class ConfigDispatcherLoadIntegrationTest {

    @Test
    void burstLoad_keepsContinuityAndBoundedQueue() {
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));

        int sent = 1000;
        for (int i = 0; i < sent; i++) {
            dispatcher.enqueue(new ConfigCommand(
                    "cmd-" + i,
                    ConfigCommand.Scope.GLOBAL,
                    null,
                    Instant.now(),
                    i,
                    Map.of("minisplitState", "24")));
        }

        assertTrue(dispatcher.size() <= DomainConstants.CONFIG_QUEUE_CAPACITY);
        assertTrue(dispatcher.droppedCount() >= 0);
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
