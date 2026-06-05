package com.safeair.emulator.integration.mqtt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;

@SpringBootTest
class ConfigDispatcherCapacityIntegrationTest {

    @Test
    void queueSaturation_usesFixedCapacityAndDropOldest() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        ConfigDispatcher dispatcher = new ConfigDispatcher(manager);

        int overfill = DomainConstants.CONFIG_QUEUE_CAPACITY + 5;
        for (int i = 0; i < overfill; i++) {
            dispatcher.enqueue(new ConfigCommand(
                    "cmd-" + i,
                    ConfigCommand.Scope.EMULATOR,
                    "EMU-" + i,
                    Instant.now(),
                    i,
                    Map.of("minisplitState", "24")));
        }

        assertEquals(DomainConstants.CONFIG_QUEUE_CAPACITY, dispatcher.size());
        assertEquals(5L, dispatcher.droppedCount());
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
