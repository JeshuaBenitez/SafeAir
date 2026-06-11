package com.safeair.emulator.config;

import java.util.List;
import java.util.concurrent.ExecutorService;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.adapter.ConfigAdapter;
import com.safeair.emulator.api.adapter.TelemetryAdapter;
import com.safeair.emulator.api.client.ApiStorageClient;
import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.mqtt.ConsolePublisher;
import com.safeair.emulator.api.mqtt.MQTTConnector;
import com.safeair.emulator.api.mqtt.MqttPublisher;
import com.safeair.emulator.api.mqtt.MQTTSubscriber;
import com.safeair.emulator.api.mqtt.ActuatorCommandSubscriber;
import com.safeair.emulator.api.mqtt.EmulatorProvisioningSubscriber;
import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import com.safeair.emulator.manager.ConfigDispatcher;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.manager.TelemetryDispatcher;

@Configuration
@EnableConfigurationProperties(MqttProperties.class)
public class LocalModeConfig {

    @Bean
    public TelemetryQueue telemetryQueue() {
        return new TelemetryQueue(DomainConstants.TELEMETRY_QUEUE_CAPACITY);
    }

    @Bean
    public Request requestClient() {
        return new ApiStorageClient();
    }

    @Bean
    public ConsolePublisher consolePublisher() {
        return new ConsolePublisher();
    }

    @Bean
    public TelemetryAdapter telemetryAdapter() {
        return new TelemetryAdapter();
    }

    @Bean
    public ConfigAdapter configAdapter() {
        return new ConfigAdapter();
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    public MQTTConnector mqttConnector(MqttProperties properties) {
        return new MQTTConnector(properties);
    }

    @Bean
    public MqttPublisher mqttPublisher(MQTTConnector connector, TelemetryAdapter telemetryAdapter) {
        return new MqttPublisher(connector, telemetryAdapter);
    }

    @Bean
    public TelemetryDispatcher telemetryDispatcher(
            TelemetryQueue queue,
            ConsolePublisher consolePublisher,
            MqttPublisher mqttPublisher,
            MqttProperties properties,
            @Value("${safeair.cli.suppress-telemetry-output:false}") boolean suppressTelemetryOutput) {
        List<SendInfo> channels;
        if (!suppressTelemetryOutput && properties.isConsoleLogEnabled() && properties.isEnabled()) {
            channels = List.of(consolePublisher, mqttPublisher);
        } else if (!suppressTelemetryOutput && properties.isConsoleLogEnabled()) {
            channels = List.of(consolePublisher);
        } else if (properties.isEnabled()) {
            channels = List.of(mqttPublisher);
        } else {
            channels = List.of();
        }
        return new TelemetryDispatcher(queue, channels);
    }

    @Bean
    @Profile({"profile1", "local-demo"})
    public ConfigDispatcher configDispatcher(EmulatorManager emulatorManager) {
        return new ConfigDispatcher(emulatorManager);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    @Profile({"profile1", "local-demo"})
    public MQTTSubscriber mqttSubscriber(
            MQTTConnector connector,
            ConfigAdapter configAdapter,
            ConfigDispatcher configDispatcher) {
        return new MQTTSubscriber(connector, configAdapter, configDispatcher);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    @Profile({"profile1", "local-demo"})
    public ActuatorCommandSubscriber actuatorCommandSubscriber(
            MQTTConnector connector,
            EmulatorManager emulatorManager,
            MqttPublisher mqttPublisher) {
        return new ActuatorCommandSubscriber(connector, emulatorManager, mqttPublisher);
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    @Profile({"profile1", "local-demo"})
    public EmulatorProvisioningSubscriber emulatorProvisioningSubscriber(
            MQTTConnector connector,
            EmulatorManager emulatorManager,
            TelemetryQueue telemetryQueue,
            EmulatorLogStore logStore) {
        return new EmulatorProvisioningSubscriber(connector, emulatorManager, telemetryQueue, logStore);
    }

    @Bean(initMethod = "startDispatch", destroyMethod = "stopDispatch")
    public DispatchLifecycle dispatchLifecycle(
            @Qualifier("telemetryDispatcherExecutor") ExecutorService telemetryDispatcherExecutor,
            TelemetryDispatcher telemetryDispatcher) {
        return new DispatchLifecycle(telemetryDispatcherExecutor, telemetryDispatcher);
    }

    @Bean(initMethod = "startDispatch", destroyMethod = "stopDispatch")
    @Profile({"profile1", "local-demo"})
    public ConfigDispatchLifecycle configDispatchLifecycle(
            @Qualifier("configDispatcherExecutor") ExecutorService configDispatcherExecutor,
            ConfigDispatcher configDispatcher) {
        return new ConfigDispatchLifecycle(configDispatcherExecutor, configDispatcher);
    }

    public static class DispatchLifecycle {
        private final ExecutorService executor;
        private final TelemetryDispatcher dispatcher;

        public DispatchLifecycle(ExecutorService executor, TelemetryDispatcher dispatcher) {
            this.executor = executor;
            this.dispatcher = dispatcher;
        }

        public void startDispatch() {
            executor.submit(dispatcher);
        }

        public void stopDispatch() {
            dispatcher.stop();
            executor.shutdown();
        }
    }

    public static class ConfigDispatchLifecycle {
        private final ExecutorService executor;
        private final ConfigDispatcher dispatcher;

        public ConfigDispatchLifecycle(ExecutorService executor, ConfigDispatcher dispatcher) {
            this.executor = executor;
            this.dispatcher = dispatcher;
        }

        public void startDispatch() {
            executor.submit(dispatcher);
        }

        public void stopDispatch() {
            dispatcher.stop();
            executor.shutdown();
        }
    }
}
