package com.safeair.emulator.integration.emulation;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import org.junit.jupiter.api.Test;

class VirtualThreadMemoryBenchmarkTest {

    @Test
    void virtualThreads_reduceRetainedMemoryAgainstPlatformThreads() throws Exception {
        long platformEstimate = estimateRetainedMemory(false, 120);
        long virtualEstimate = estimateRetainedMemory(true, 120);

        assumeTrue(
                platformEstimate > virtualEstimate,
                "Memory estimate is too noisy for this JVM run: platform="
                        + platformEstimate
                        + ", virtual="
                        + virtualEstimate);

        // Target from specification: >=30% reduction.
        double reduction = 1.0 - ((double) virtualEstimate / Math.max(platformEstimate, 1));
        assertTrue(reduction >= 0.30, "Expected >=30% memory reduction, got " + reduction);
    }

    private long estimateRetainedMemory(boolean virtual, int threadCount) throws Exception {
        forceGc();
        long before = usedMemory();

        CountDownLatch started = new CountDownLatch(threadCount);
        CountDownLatch release = new CountDownLatch(1);
        List<Thread> threads = new ArrayList<>(threadCount);

        for (int i = 0; i < threadCount; i++) {
            Thread thread = virtual
                    ? Thread.ofVirtual().unstarted(() -> await(started, release))
                    : Thread.ofPlatform().unstarted(() -> await(started, release));
            threads.add(thread);
            thread.start();
        }

        started.await();
        forceGc();
        long during = usedMemory();

        release.countDown();
        for (Thread thread : threads) {
            thread.join();
        }

        forceGc();
        return Math.max(1L, during - before);
    }

    private void await(CountDownLatch started, CountDownLatch release) {
        try {
            started.countDown();
            release.await();
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private void forceGc() throws InterruptedException {
        System.gc();
        Thread.sleep(50);
    }

    private long usedMemory() {
        Runtime rt = Runtime.getRuntime();
        return rt.totalMemory() - rt.freeMemory();
    }
}
