package com.safeair.emulator.integration.mqtt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;

class MQTTConfigConflictResolutionIntegrationTest {

    @Test
    void specificCommand_overridesPendingGlobalCommand() {
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));

        dispatcher.enqueue(MqttTestSupport.globalCommand());
        dispatcher.enqueue(MqttTestSupport.specificCommand("EMU-0001"));

        assertEquals(1, dispatcher.size());
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
