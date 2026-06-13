package com.safeair.emulator.unit.api.mqtt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.api.mqtt.EmulatorProvisioningSubscriber;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MqttTopics;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;

class EmulatorProvisioningSubscriberTest {

    @Test
    void start_subscribesToProvisionTopic() {
        RecordingConnector connector = new RecordingConnector();
        EmulatorProvisioningSubscriber subscriber = new EmulatorProvisioningSubscriber(
                connector,
                new EmulatorManager(new StaticRequest()),
                new TelemetryQueue(16),
                new EmulatorLogStore());

        subscriber.start();

        assertEquals(
                List.of(MqttTopics.EMULATOR_PROVISION_TOPIC, MqttTopics.EMULATOR_PROVISION_WILDCARD),
                connector.subscriptions());
    }

    @Test
    void onMessage_validProvision_createsRunningEmulator() {
        EmulatorLogStore logStore = new EmulatorLogStore();
        EmulatorManager manager = new EmulatorManager(new StaticRequest(), null, logStore);
        EmulatorProvisioningSubscriber subscriber = new EmulatorProvisioningSubscriber(
                new RecordingConnector(),
                manager,
                new TelemetryQueue(16),
                logStore);

        subscriber.onMessage(MqttTopics.EMULATOR_PROVISION_TOPIC, provisionPayload("EMU-U004-R001"));

        assertEquals(1, manager.getEmulatorCount());
        assertEquals("RUNNING", manager.getEmulator("EMU-U004-R001").snapshot().state().name());
        assertTrue(logStore.findByEmulator("EMU-U004-R001", 20).stream()
                .anyMatch(entry -> "emulator.provision.created".equals(entry.category())));
    }

    @Test
    void onMessage_duplicateProvision_isIdempotent() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        EmulatorProvisioningSubscriber subscriber = new EmulatorProvisioningSubscriber(
                new RecordingConnector(),
                manager,
                new TelemetryQueue(16),
                new EmulatorLogStore());

        byte[] payload = provisionPayload("EMU-U004-R002");
        subscriber.onMessage(MqttTopics.EMULATOR_PROVISION_TOPIC, payload);
        subscriber.onMessage(MqttTopics.EMULATOR_PROVISION_TOPIC, payload);

        assertEquals(1, manager.getEmulatorCount());
    }

    @Test
    void onMessage_retainedPerEmulatorProvision_createsEmulator() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        EmulatorProvisioningSubscriber subscriber = new EmulatorProvisioningSubscriber(
                new RecordingConnector(),
                manager,
                new TelemetryQueue(16),
                new EmulatorLogStore());

        subscriber.onMessage("safeair/EMU-U004-R003/provision", provisionPayload("EMU-U004-R003"));

        assertEquals(1, manager.getEmulatorCount());
    }

    @Test
    void onMessage_deprovision_removesRunningEmulatorIdempotently() {
        EmulatorManager manager = new EmulatorManager(new StaticRequest());
        EmulatorProvisioningSubscriber subscriber = new EmulatorProvisioningSubscriber(
                new RecordingConnector(),
                manager,
                new TelemetryQueue(16),
                new EmulatorLogStore());

        subscriber.onMessage("safeair/EMU-U004-R004/provision", provisionPayload("EMU-U004-R004"));
        subscriber.onMessage("safeair/EMU-U004-R004/provision", deprovisionPayload("EMU-U004-R004"));
        subscriber.onMessage("safeair/EMU-U004-R004/provision", deprovisionPayload("EMU-U004-R004"));

        assertEquals(0, manager.getEmulatorCount());
    }

    private byte[] provisionPayload(String emulatorExternalId) {
        return ("""
                {
                  "type": "PROVISION_EMULATOR",
                  "emulatorExternalId": "%s",
                  "roomId": "room-1",
                  "config": {
                    "roomSquareMeters": 42,
                    "windowCount": 2,
                    "sensorTypes": [1, 2, 3, 4],
                    "deviceTypes": [1, 2, 3],
                    "updateIntervalSec": 1
                  }
                }
                """.formatted(emulatorExternalId)).getBytes(StandardCharsets.UTF_8);
    }

    private byte[] deprovisionPayload(String emulatorExternalId) {
        return ("""
                {
                  "type": "DEPROVISION_EMULATOR",
                  "emulatorExternalId": "%s",
                  "roomId": "room-1"
                }
                """.formatted(emulatorExternalId)).getBytes(StandardCharsets.UTF_8);
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

    private static final class StaticRequest implements com.safeair.emulator.api.client.Request {
        @Override
        public DtoSetup getSetup(String emulatorId) {
            return new DtoSetup(emulatorId, 1, 35, 1, new int[] {1}, new int[] {1});
        }
    }
}
