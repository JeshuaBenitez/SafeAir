package com.safeair.emulator.config;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExecutorConfig {

    @Bean(name = "emulatorManagerExecutor")
    public ExecutorService emulatorManagerExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean(name = "telemetryDispatcherExecutor")
    public ExecutorService telemetryDispatcherExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean(name = "configDispatcherExecutor")
    public ExecutorService configDispatcherExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
