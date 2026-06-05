package com.safeair.emulator.emulation.core;

import java.util.ArrayDeque;
import java.util.Deque;

public class TelemetryQueue {
    private final Deque<TelemetryPayload> queue = new ArrayDeque<>();
    private final int capacity;
    private long droppedCount;

    public TelemetryQueue(int capacity) {
        this.capacity = capacity;
    }

    public synchronized void offer(TelemetryPayload payload) {
        if (queue.size() >= capacity) {
            queue.pollFirst();
            droppedCount++;
        }
        queue.offerLast(payload);
        notifyAll();
    }

    public synchronized TelemetryPayload poll(long timeoutMillis) throws InterruptedException {
        if (queue.isEmpty()) {
            wait(timeoutMillis);
        }
        return queue.pollFirst();
    }

    public synchronized int size() {
        return queue.size();
    }

    public synchronized long droppedCount() {
        return droppedCount;
    }

    public int capacity() {
        return capacity;
    }
}
