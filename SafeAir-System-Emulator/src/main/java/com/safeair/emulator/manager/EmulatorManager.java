package com.safeair.emulator.manager;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;

public class EmulatorManager {
    private final Map<String, Emulator> emulators = new ConcurrentHashMap<>();
    private final Request requestInfo;

    public EmulatorManager(Request requestInfo) {
        this.requestInfo = requestInfo;
    }

    public void addEmulator(Emulator emulator) {
        emulators.put(emulator.emulatorId(), emulator);
        refreshActiveCounts();
    }

    public void removeEmulator(String emulatorId) {
        Emulator removed = emulators.remove(emulatorId);
        if (removed != null) {
            removed.stop();
        }
        refreshActiveCounts();
    }

    public void setupAll() {
        emulators.values().forEach(this::setup);
    }

    public void setup(String emulatorId) {
        Emulator emulator = getEmulator(emulatorId);
        if (emulator != null) {
            setup(emulator);
        }
    }

    private void setup(Emulator emulator) {
        DtoSetup dto = requestInfo.getSetup(emulator.emulatorId());
        emulator.applySetup(dto);
    }

    public void startAll() {
        emulators.values().forEach(Emulator::start);
    }

    public void stopAll() {
        emulators.values().forEach(Emulator::stop);
    }

    public Emulator getEmulator(String emulatorId) {
        return emulators.get(emulatorId);
    }

    public int getEmulatorCount() {
        return emulators.size();
    }

    public void applyConfig(ConfigCommand command) {
        if (command.isGlobal()) {
            emulators.values().forEach(e -> e.applyConfig(command));
            return;
        }
        applyConfig(command.targetEmulatorId(), command);
    }

    public void applyConfig(String emulatorId, ConfigCommand command) {
        if (emulatorId == null || emulatorId.isBlank()) {
            return;
        }
        Emulator emulator = emulators.get(emulatorId);
        if (emulator != null) {
            emulator.applyConfig(command);
        }
    }

    private void refreshActiveCounts() {
        int size = emulators.size();
        emulators.values().forEach(e -> e.setActiveEmulatorCount(size));
    }
}
