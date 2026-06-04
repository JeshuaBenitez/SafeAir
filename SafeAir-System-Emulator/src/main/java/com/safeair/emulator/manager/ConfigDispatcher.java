package com.safeair.emulator.manager;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.atomic.AtomicBoolean;

import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.emulation.core.DomainConstants;

public class ConfigDispatcher implements Runnable {
    private final EmulatorManager emulatorManager;
    private final Deque<ConfigCommand> queue = new ArrayDeque<>();
    private final AtomicBoolean running = new AtomicBoolean(true);
    private long droppedCount;

    public ConfigDispatcher(EmulatorManager emulatorManager) {
        this.emulatorManager = emulatorManager;
    }

    public synchronized void enqueue(ConfigCommand command) {
        if (command == null) {
            return;
        }

        // Specific commands have priority over pending global commands.
        if (command.isSpecific()) {
            queue.removeIf(ConfigCommand::isGlobal);
        }

        // For same scope/target, newest command wins by replacing older pending commands.
        queue.removeIf(existing -> sameScopeTarget(existing, command));

        if (queue.size() >= DomainConstants.CONFIG_QUEUE_CAPACITY) {
            queue.pollFirst();
            droppedCount++;
        }
        queue.offerLast(command);
        notifyAll();
    }

    private boolean sameScopeTarget(ConfigCommand left, ConfigCommand right) {
        if (left.scope() != right.scope()) {
            return false;
        }
        if (left.isGlobal()) {
            return true;
        }
        return left.targetEmulatorId().equals(right.targetEmulatorId());
    }

    public synchronized ConfigCommand poll(long timeoutMillis) throws InterruptedException {
        if (queue.isEmpty()) {
            wait(timeoutMillis);
        }
        return queue.pollFirst();
    }

    public synchronized long droppedCount() {
        return droppedCount;
    }

    public synchronized int size() {
        return queue.size();
    }

    public void stop() {
        running.set(false);
    }

    @Override
    public void run() {
        while (running.get()) {
            try {
                ConfigCommand command = poll(200);
                if (command == null) {
                    continue;
                }
                emulatorManager.applyConfig(command);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }
}
