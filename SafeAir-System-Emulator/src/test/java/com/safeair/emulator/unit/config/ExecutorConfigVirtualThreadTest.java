package com.safeair.emulator.unit.config;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.config.ExecutorConfig;

class ExecutorConfigVirtualThreadTest {

    @Test
    void executors_useVirtualThreads() {
        ExecutorConfig config = new ExecutorConfig();

        assertVirtual(config.emulatorManagerExecutor());
        assertVirtual(config.telemetryDispatcherExecutor());
        assertVirtual(config.configDispatcherExecutor());
    }

    private void assertVirtual(ExecutorService executor) {
        try {
            CompletableFuture<Boolean> future = new CompletableFuture<>();
            executor.submit(() -> future.complete(Thread.currentThread().isVirtual()));
            assertTrue(future.join(), "Expected virtual-thread-backed executor");
        } finally {
            executor.shutdown();
        }
    }
}
