package com.safeair.emulator.manager;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;

@Component
public class EmulatorLogStore implements EmulatorEventListener {
    private static final int DEFAULT_CAPACITY = 2_000;

    private final AtomicLong sequence = new AtomicLong();
    private final Deque<EmulatorLogEntry> entries = new ArrayDeque<>();

    @Override
    public synchronized void onEvent(String emulatorId, String category, String message) {
        entries.addLast(new EmulatorLogEntry(
                sequence.incrementAndGet(),
                Instant.now(),
                emulatorId,
                category,
                message));
        while (entries.size() > DEFAULT_CAPACITY) {
            entries.removeFirst();
        }
    }

    public synchronized List<EmulatorLogEntry> findAllOrdered(int limit) {
        return snapshot(entries, limit);
    }

    public synchronized List<EmulatorLogEntry> findByEmulator(String emulatorId, int limit) {
        if (emulatorId == null || emulatorId.isBlank()) {
            return List.of();
        }
        List<EmulatorLogEntry> filtered = entries.stream()
                .filter(entry -> entry.emulatorId().equalsIgnoreCase(emulatorId))
                .sorted(Comparator.comparingLong(EmulatorLogEntry::sequence))
                .toList();
        return trimToLimit(filtered, limit);
    }

    private List<EmulatorLogEntry> snapshot(Deque<EmulatorLogEntry> source, int limit) {
        List<EmulatorLogEntry> ordered = new ArrayList<>(source);
        ordered.sort(Comparator.comparingLong(EmulatorLogEntry::sequence));
        return trimToLimit(ordered, limit);
    }

    private List<EmulatorLogEntry> trimToLimit(List<EmulatorLogEntry> entries, int limit) {
        if (limit <= 0 || entries.size() <= limit) {
            return List.copyOf(entries);
        }
        return List.copyOf(entries.subList(entries.size() - limit, entries.size()));
    }
}
