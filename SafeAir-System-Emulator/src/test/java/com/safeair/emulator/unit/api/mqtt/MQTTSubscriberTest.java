package com.safeair.emulator.unit.api.mqtt;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.ConfigAdapter;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MQTTSubscriber;
import com.safeair.emulator.api.mqtt.MqttTopics;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.DtoSetup;

class MQTTSubscriberTest {

    @Test
    void onMessage_invalidPayload_isRejectedWithoutQueueing() {
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));
        MQTTSubscriber subscriber = new MQTTSubscriber(
                new MQTTConnector(new MqttProperties()),
                new ConfigAdapter(),
                dispatcher);

        assertDoesNotThrow(() -> subscriber.onMessage(MqttTopics.GLOBAL_CONFIG_TOPIC, new byte[] {1, 2, 3}));
        assertEquals(0, dispatcher.size());
    }

    @Test
    void onMessage_validCommand_isQueued() {
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));
        MQTTSubscriber subscriber = new MQTTSubscriber(
                new MQTTConnector(new MqttProperties()),
                new PassThroughAdapter(),
                dispatcher);

        subscriber.onMessage(MqttTopics.GLOBAL_CONFIG_TOPIC, new byte[] {9});

        assertEquals(1, dispatcher.size());
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }

    private static final class PassThroughAdapter extends ConfigAdapter {
        @Override
        public ConfigCommand toCommand(byte[] payload) {
            return new ConfigCommand(
                    "cmd",
                    ConfigCommand.Scope.GLOBAL,
                    null,
                    Instant.now(),
                    1L,
                    Map.of("minisplitState", "24"));
        }
    }
}
