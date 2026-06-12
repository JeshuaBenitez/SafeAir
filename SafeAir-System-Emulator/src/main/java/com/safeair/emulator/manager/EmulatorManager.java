package com.safeair.emulator.manager;

import java.util.Map;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

import com.safeair.emulator.api.client.Request;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.core.Emulator;

public class EmulatorManager {
    private final Map<String, Emulator> emulators = new ConcurrentHashMap<>();
    private final Request requestInfo;
    private final ExecutorService commandExecutor;
    private final EmulatorEventListener eventListener;

    public EmulatorManager(Request requestInfo) {
        this(requestInfo, null, EmulatorEventListener.NO_OP);
    }

    public EmulatorManager(Request requestInfo, ExecutorService commandExecutor, EmulatorEventListener eventListener) {
        this.requestInfo = requestInfo;
        this.commandExecutor = commandExecutor;
        this.eventListener = eventListener == null ? EmulatorEventListener.NO_OP : eventListener;
    }

    public void addEmulator(Emulator emulator) {
        emulators.put(emulator.emulatorId(), emulator);
        refreshActiveCounts();
        eventListener.onEvent(emulator.emulatorId(), "manager", "Registered emulator");
    }

    public void removeEmulator(String emulatorId) {
        Emulator removed = emulators.remove(emulatorId);
        if (removed != null) {
            removed.stop();
            eventListener.onEvent(emulatorId, "manager", "Removed emulator");
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

    public List<EmulatorSnapshot> listSnapshots() {
        return emulators.values().stream()
                .map(Emulator::snapshot)
                .sorted((left, right) -> left.emulatorId().compareToIgnoreCase(right.emulatorId()))
                .toList();
    }

    public List<ActuatorSnapshot> listActuators(String emulatorId) {
        Emulator emulator = emulators.get(emulatorId);
        if (emulator == null) {
            return List.of();
        }
        return emulator.actuatorSnapshots();
    }

    public ActuatorCommandResult applyActuatorCommand(
            String emulatorId,
            String deviceType,
            int deviceIndex,
            String action,
            Integer value) {
        Emulator emulator = emulators.get(emulatorId);
        if (emulator == null) {
            return ActuatorCommandResult.error("emulator_not_found");
        }
        return emulator.applyActuatorCommand(deviceType, deviceIndex, action, value);
    }

    public void applyConfig(ConfigCommand command) {
        if (command.isGlobal()) {
            runAcrossEmulators(emulator -> emulator.applyConfig(command));
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

    public String applyScenario(String emulatorId, String scenario) {
        Emulator emulator = emulators.get(emulatorId);
        if (emulator == null) {
            return "emulator_not_found";
        }
        return emulator.applyScenario(scenario);
    }

    public void applyScenarioToAll(String scenario) {
        runAcrossEmulators(emulator -> emulator.applyScenario(scenario));
    }

    public String applyBehavior(String emulatorId, String action, String value) {
        Emulator emulator = emulators.get(emulatorId);
        if (emulator == null) {
            return "emulator_not_found";
        }
        return emulator.applyBehaviorCommand(action, value);
    }

    public void applyBehaviorToAll(String action, String value) {
        runAcrossEmulators(emulator -> emulator.applyBehaviorCommand(action, value));
    }

    private void refreshActiveCounts() {
        int size = emulators.size();
        emulators.values().forEach(e -> e.setActiveEmulatorCount(size));
    }

    private void runAcrossEmulators(EmulatorTask task) {
        if (commandExecutor == null) {
            emulators.values().forEach(task::run);
            return;
        }

        List<? extends Future<?>> futures = emulators.values().stream()
                .map(emulator -> commandExecutor.submit(() -> task.run(emulator)))
                .toList();
        for (Future<?> future : futures) {
            try {
                future.get();
            } catch (Exception ex) {
                throw new IllegalStateException("Failed to apply command to all emulators", ex);
            }
        }
    }

    @FunctionalInterface
    private interface EmulatorTask {
        void run(Emulator emulator);
    }
}
