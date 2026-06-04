package com.safeair.emulator.integration.mqtt;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.adapter.ConfigAdapter;
import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MQTTSubscriber;
import com.safeair.emulator.api.mqtt.MqttTopics;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorManager;

class MQTTConfigSubscribeIntegrationTest {

    @Test
    void start_subscribesToGlobalAndEmulatorTopics() {
        RecordingConnector connector = new RecordingConnector();
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));
        MQTTSubscriber subscriber = new MQTTSubscriber(connector, new ConfigAdapter(), dispatcher);

        subscriber.start();

        assertEquals(2, connector.subscriptions().size());
        assertTrue(connector.subscriptions().contains(MqttTopics.GLOBAL_CONFIG_TOPIC));
        assertTrue(connector.subscriptions().contains(MqttTopics.EMULATOR_CONFIG_WILDCARD));
    }

    @Test
    void onMessage_validPayload_enqueuesCommand() {
        RecordingConnector connector = new RecordingConnector();
        ConfigDispatcher dispatcher = new ConfigDispatcher(new EmulatorManager(new StaticRequest()));
        MQTTSubscriber subscriber = new MQTTSubscriber(connector, new PassThroughConfigAdapter(), dispatcher);

        subscriber.onMessage(MqttTopics.GLOBAL_CONFIG_TOPIC, new byte[] {1});

        assertEquals(1, dispatcher.size());
    }

    private static final class RecordingConnector extends MQTTConnector {
        private final List<String> subscriptions = new ArrayList<>();

        RecordingConnector() {
            super(enabledProps());
        }

        @Override
        public void subscribe(String topic, int qos) {
            subscriptions.add(topic);
        }

        List<String> subscriptions() {
            return subscriptions;
        }

        private static MqttProperties enabledProps() {
            MqttProperties props = new MqttProperties();
            props.setEnabled(true);
            return props;
        }
    }

    private static final class PassThroughConfigAdapter extends ConfigAdapter {
        @Override
        public ConfigCommand toCommand(byte[] payload) {
            return MqttTestSupport.globalCommand();
        }
    }

    private static final class StaticRequest implements Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
