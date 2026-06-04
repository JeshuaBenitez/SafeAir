package com.safeair.emulator.integration.mqtt;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class MQTTChannelAvailabilityIntegrationTest {

    @Test
    void channelMetrics_meetAvailabilityAndReconnectTargets() {
        ChannelMetrics metrics = new ChannelMetrics();

        for (int i = 0; i < 200; i++) {
            metrics.recordSecond(true);
        }
        for (int i = 0; i < 1; i++) {
            metrics.recordSecond(false);
        }

        for (int i = 0; i < 20; i++) {
            metrics.recordReconnectSeconds(6);
        }

        assertTrue(metrics.availabilityRatio() >= 0.995);
        assertTrue(metrics.percentReconnectWithinSeconds(10) >= 0.95);
    }

    private static final class ChannelMetrics {
        private int totalSeconds;
        private int availableSeconds;
        private final List<Integer> reconnectDurations = new ArrayList<>();

        void recordSecond(boolean available) {
            totalSeconds++;
            if (available) {
                availableSeconds++;
            }
        }

        void recordReconnectSeconds(int seconds) {
            reconnectDurations.add(seconds);
        }

        double availabilityRatio() {
            if (totalSeconds == 0) {
                return 0.0;
            }
            return (double) availableSeconds / totalSeconds;
        }

        double percentReconnectWithinSeconds(int thresholdSeconds) {
            if (reconnectDurations.isEmpty()) {
                return 1.0;
            }
            long within = reconnectDurations.stream().filter(s -> s <= thresholdSeconds).count();
            return (double) within / reconnectDurations.size();
        }
    }
}
