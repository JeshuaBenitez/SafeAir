package com.safeair.emulator.manager;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.emulation.core.TelemetryPayload;
import com.safeair.emulator.emulation.core.TelemetryQueue;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class TelemetryDispatcher implements Runnable {
    private static final Logger LOGGER = LoggerFactory.getLogger(TelemetryDispatcher.class);

    private final TelemetryQueue queue;
    private final List<SendInfo> channels;
    private final AtomicBoolean running = new AtomicBoolean(true);

    public TelemetryDispatcher(TelemetryQueue queue, List<SendInfo> channels) {
        this.queue = queue;
        this.channels = channels;
    }

    public void stop() {
        running.set(false);
    }

    @Override
    public void run() {
        while (running.get()) {
            try {
                TelemetryPayload payload = queue.poll(200);
                if (payload == null) {
                    continue;
                }
                for (SendInfo channel : channels) {
                    try {
                        channel.send(payload);
                    } catch (RuntimeException ex) {
                        LOGGER.warn("Failed to dispatch telemetry payload on channel {}: {}",
                                channel.getClass().getSimpleName(),
                                ex.getMessage());
                        LOGGER.debug("Failed to dispatch telemetry payload", ex);
                    }
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }
}
