package com.safeair.emulator.unit.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import com.safeair.emulator.api.mqtt.ConsolePublisher;
import com.safeair.emulator.api.mqtt.MqttPublisher;
import com.safeair.emulator.config.LocalModeConfig;
import com.safeair.emulator.config.MqttProperties;
import com.safeair.emulator.emulation.core.RoomStateSnapshot;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.TelemetryDispatcher;

class LocalModeConfigTest {

    @Test
    void telemetryDispatcher_whenCliSuppressesTelemetry_keepsMqttAndSkipsConsole() throws Exception {
        TelemetryQueue queue = new TelemetryQueue(16);
        CountingConsolePublisher consolePublisher = new CountingConsolePublisher();
        CountingMqttPublisher mqttPublisher = new CountingMqttPublisher();
        MqttProperties properties = new MqttProperties();
        properties.setEnabled(true);
        properties.setConsoleLogEnabled(true);

        TelemetryDispatcher dispatcher = new LocalModeConfig().telemetryDispatcher(
                queue,
                consolePublisher,
                mqttPublisher,
                properties,
                true);

        dispatchOnePayload(queue, dispatcher);

        assertEquals(0, consolePublisher.sentCount());
        assertEquals(1, mqttPublisher.sentCount());
    }

    @Test
    void telemetryDispatcher_whenConsoleDisabled_keepsMqttChannel() throws Exception {
        TelemetryQueue queue = new TelemetryQueue(16);
        CountingConsolePublisher consolePublisher = new CountingConsolePublisher();
        CountingMqttPublisher mqttPublisher = new CountingMqttPublisher();
        MqttProperties properties = new MqttProperties();
        properties.setEnabled(true);
        properties.setConsoleLogEnabled(false);

        TelemetryDispatcher dispatcher = new LocalModeConfig().telemetryDispatcher(
                queue,
                consolePublisher,
                mqttPublisher,
                properties,
                false);

        dispatchOnePayload(queue, dispatcher);

        assertEquals(0, consolePublisher.sentCount());
        assertEquals(1, mqttPublisher.sentCount());
    }

    private void dispatchOnePayload(TelemetryQueue queue, TelemetryDispatcher dispatcher) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.submit(dispatcher);
        queue.offer(makePayload());
        Thread.sleep(300);
        dispatcher.stop();
        executor.shutdown();
        executor.awaitTermination(1, TimeUnit.SECONDS);
    }

    private TelemetryPayload makePayload() {
        RoomStateSnapshot snapshot = new RoomStateSnapshot(24, 45, 500, 10, 0.17, 25, 2);
        return new TelemetryPayload(Instant.now(), "EMU-0001", 0, 0, 1, 0, snapshot, null, null);
    }

    private static final class CountingConsolePublisher extends ConsolePublisher {
        private final AtomicInteger sentCount = new AtomicInteger();

        @Override
        public void send(Object data) {
            sentCount.incrementAndGet();
        }

        int sentCount() {
            return sentCount.get();
        }
    }

    private static final class CountingMqttPublisher extends MqttPublisher {
        private final AtomicInteger sentCount = new AtomicInteger();

        @Override
        public void send(Object data) {
            sentCount.incrementAndGet();
        }

        int sentCount() {
            return sentCount.get();
        }
    }
}
