package com.safeair.emulator.emulation.core;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.abstracts.Sensor;
import com.safeair.emulator.api.dto.ConfigCommand;
import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.impl.ElectrodomesticFactory;
import com.safeair.emulator.emulation.impl.SensorFactory;
import com.safeair.emulator.emulation.simulation.ConvergenceEvaluator;
import com.safeair.emulator.emulation.simulation.EmulatorSeedStrategy;
import com.safeair.emulator.emulation.simulation.RandomSource;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.emulation.simulation.SeededRandomSource;
import com.safeair.emulator.emulation.simulation.SimulationEngine;
import com.safeair.emulator.manager.EmulatorLifecycleState;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Emulator {
    private static final Logger LOGGER = LoggerFactory.getLogger(Emulator.class);
    
    private final String emulatorId;
    private final SensorFactory sensorFactory = new SensorFactory();
    private final ElectrodomesticFactory electrodomesticFactory = new ElectrodomesticFactory();
    private final AtomicLong tickCounter = new AtomicLong(0);

    private final List<Sensor> sensors = new ArrayList<>();
    private final List<Electrodomestic> electrodomestics = new ArrayList<>();

    private final TelemetryQueue telemetryQueue;
    private final RandomSource randomSource;
    private Room room;
    private SimulationEngine simulationEngine;
    private ScheduledExecutorService executor;
    private EmulatorLifecycleState state = EmulatorLifecycleState.CREATED;
    private volatile int activeEmulatorCount = 1;

    public Emulator(String emulatorId, TelemetryQueue telemetryQueue) {
        this.emulatorId = emulatorId;
        this.telemetryQueue = telemetryQueue;
        this.randomSource = new SeededRandomSource(EmulatorSeedStrategy.seedFrom(emulatorId));
    }

    public String emulatorId() {
        return emulatorId;
    }

    public synchronized void applySetup(DtoSetup dto) {
        room = new Room(dto.roomSquareMeters(), dto.windowCount(), dto.updateIntervalSec(), randomSource);
        simulationEngine = new SimulationEngine(new RoomEnvironmentHelper(), new ConvergenceEvaluator());

        sensors.clear();
        for (int type : dto.sensorTypes()) {
            sensors.add(sensorFactory.create(type, sensorSupplier(type)));
        }

        electrodomestics.clear();
        for (int type : dto.deviceTypes()) {
            electrodomestics.add(electrodomesticFactory.create(type));
        }

        state = EmulatorLifecycleState.CONFIGURED;
    }

    private java.util.function.Supplier<Double> sensorSupplier(int type) {
        return switch (type) {
            case SensorFactory.HUMIDITY -> () -> room.humidity();
            case SensorFactory.TEMPERATURE -> () -> room.temperature();
            case SensorFactory.CO2 -> () -> room.co2();
            case SensorFactory.PM25 -> () -> room.pm25();
            default -> () -> 0.0;
        };
    }

    public synchronized void start() {
        if (state == EmulatorLifecycleState.RUNNING) {
            return;
        }
        state = EmulatorLifecycleState.RUNNING;
        executor = Executors.newScheduledThreadPool(1);
        long intervalMs = room.updateIntervalSec() * 1000L;
        executor.scheduleAtFixedRate(this::tickCycle, 0, intervalMs, TimeUnit.MILLISECONDS);
    }

    public synchronized void stop() {
        if (state == EmulatorLifecycleState.STOPPED || state == EmulatorLifecycleState.STOPPING) {
            return;
        }
        state = EmulatorLifecycleState.STOPPING;
        if (executor != null) {
            executor.shutdown();
        }
        state = EmulatorLifecycleState.STOPPED;
    }

    public void setActiveEmulatorCount(int count) {
        this.activeEmulatorCount = count;
    }

    /**
     * Apply a configuration command received via MQTT.
     * 
     * Supports two modes:
     * 1. Room setup (dynamic): if payload contains "roomSquareMeters", the entire
     *    room configuration is rebuilt (area, windows, sensors, devices).
     * 2. Device state override: if payload contains device states like "minisplitState",
     *    only those device states are updated without rebuilding the room.
     * 
     * The API sends room setup as a Map&lt;String, String&gt; via ConfigAdapter.
     */
    public synchronized void applyConfig(ConfigCommand command) {
        if (command == null || command.payload().isEmpty()) {
            return;
        }

        Map<String, String> payload = command.payload();

        // ── Mode 1: Room setup (dynamic configuration) ─────────────────────────
        // Detect by presence of roomSquareMeters in the payload.
        // The API sends this as a string key-value map (ConfigAdapter compatible).
        if (payload.containsKey("roomSquareMeters")) {
            applyRoomSetupFromPayload(payload);
            return; // Room setup replaces any pending device state updates in this command
        }

        // ── Mode 2: Device state override ─────────────────────────────────────
        applyDeviceState("MiniSplit", payload.get("minisplitState"));
        applyDeviceState("HumidifierPurifier", payload.get("humidifierState"));
        applyDeviceState("AirExtractor", payload.get("airExtractorState"));
    }

    /**
     * Parse the room setup from the MQTT payload and apply it via applySetup().
     * 
     * Expected payload keys (all strings, parsed here):
     *   - roomSquareMeters  (double, e.g. "150.0")
     *   - windowCount       (int,    e.g. "3")
     *   - updateIntervalSec (int,    e.g. "5")
     *   - sensorTypes       (csv,    e.g. "1,2,3,4")
     *   - deviceTypes       (csv,    e.g. "1,1,2,3")
     *   - roomId            (string, for logging)
     *   - roomName          (string, for logging)
     *   - minisplitCount    (int,    for logging)
     *   - purifierCount     (int,    for logging)
     *   - extractorCount    (int,    for logging)
     */
    private void applyRoomSetupFromPayload(Map<String, String> payload) {
        LOGGER.info("[{}] =======================================", emulatorId);
        LOGGER.info("[{}] Received room config from API", emulatorId);

        String roomId = payload.getOrDefault("roomId", "unknown");
        String roomName = payload.getOrDefault("roomName", "unknown");
        LOGGER.info("[{}]   roomId    = {}", emulatorId, roomId);
        LOGGER.info("[{}]   roomName  = {}", emulatorId, roomName);

        try {
            // ── Parse numeric fields ────────────────────────────────────────────
            double roomSquareMeters = parseDouble(payload.get("roomSquareMeters"), 35.0);
            int windowCount = parseInt(payload.get("windowCount"), 0);
            int updateIntervalSec = parseInt(payload.get("updateIntervalSec"), 5);

            // ── Parse comma-separated arrays ───────────────────────────────────
            int[] sensorTypes = parseIntArray(payload.get("sensorTypes"), new int[]{1, 2, 3, 4});
            int[] deviceTypes = parseIntArray(payload.get("deviceTypes"), new int[]{1, 2, 3});

            // ── Log parsed values ──────────────────────────────────────────────
            LOGGER.info("[{}]   roomSquareMeters = {} m²", emulatorId, roomSquareMeters);
            LOGGER.info("[{}]   windowCount      = {}", emulatorId, windowCount);
            LOGGER.info("[{}]   updateIntervalSec= {}s", emulatorId, updateIntervalSec);
            LOGGER.info("[{}]   sensorTypes      = {}", emulatorId, intsToString(sensorTypes));
            LOGGER.info("[{}]   deviceTypes      = {}", emulatorId, intsToString(deviceTypes));

            // ── Count devices by type (for logging) ────────────────────────────
            int miniCount = 0, puriCount = 0, exCount = 0;
            for (int dt : deviceTypes) {
                if (dt == 1) miniCount++;
                else if (dt == 2) puriCount++;
                else if (dt == 3) exCount++;
            }
            LOGGER.info("[{}]   minisplit(s)     = {}", emulatorId, miniCount);
            LOGGER.info("[{}]   purifier(s)       = {}", emulatorId, puriCount);
            LOGGER.info("[{}]   extractor(s)      = {}", emulatorId, exCount);

            // ── Build DtoSetup and apply ─────────────────────────────────────
            DtoSetup dto = new DtoSetup(
                    emulatorId,
                    updateIntervalSec,
                    (int) Math.round(roomSquareMeters),
                    windowCount,
                    sensorTypes,
                    deviceTypes);

            // Stop the current executor if running (interval may change)
            boolean wasRunning = (state == EmulatorLifecycleState.RUNNING);
            if (executor != null) {
                executor.shutdownNow();
                executor = null;
            }

            // Apply the new setup
            applySetup(dto);

            // Restart telemetry loop if it was running
            if (wasRunning) {
                LOGGER.info("[{}]   Restarting telemetry loop with new interval: {}s", 
                        emulatorId, updateIntervalSec);
                executor = Executors.newScheduledThreadPool(1);
                long intervalMs = updateIntervalSec * 1000L;
                executor.scheduleAtFixedRate(this::tickCycle, 0, intervalMs, TimeUnit.MILLISECONDS);
            } else {
                LOGGER.info("[{}]   Room configured (telemetry loop not started yet, will start on next setup/start)", 
                        emulatorId);
            }

            LOGGER.info("[{}] ✓ Dynamic room config applied successfully", emulatorId);
            LOGGER.info("[{}] =======================================", emulatorId);

        } catch (Exception e) {
            LOGGER.error("[{}] ✗ Failed to apply room config: {}", emulatorId, e.getMessage(), e);
        }
    }

    // ── Payload parsing helpers ────────────────────────────────────────────────

    private double parseDouble(String value, double fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException e) {
            LOGGER.warn("[{}]   parseDouble fallback: '{}' -> {}", emulatorId, value, fallback);
            return fallback;
        }
    }

    private int parseInt(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            LOGGER.warn("[{}]   parseInt fallback: '{}' -> {}", emulatorId, value, fallback);
            return fallback;
        }
    }

    private int[] parseIntArray(String value, int[] fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            String[] parts = value.trim().split(",");
            int[] result = new int[parts.length];
            for (int i = 0; i < parts.length; i++) {
                result[i] = Integer.parseInt(parts[i].trim());
            }
            return result;
        } catch (NumberFormatException e) {
            LOGGER.warn("[{}]   parseIntArray fallback: '{}' -> {}", emulatorId, value, intsToString(fallback));
            return fallback;
        }
    }

    private String intsToString(int[] arr) {
        if (arr == null || arr.length == 0) return "[]";
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < arr.length; i++) {
            sb.append(arr[i]);
            if (i < arr.length - 1) sb.append(", ");
        }
        sb.append("]");
        return sb.toString();
    }

    private void applyDeviceState(String deviceType, String valueText) {
        if (valueText == null) {
            return;
        }
        int stateValue = Integer.parseInt(valueText);
        for (Electrodomestic device : electrodomestics) {
            if (deviceType.equals(device.getType())) {
                device.setState(stateValue);
            }
        }
    }

    private void tickCycle() {
        long start = System.nanoTime();
        tickEnvironment();
        Map<String, Double> sensorData = collectData();
        sendData(sensorData, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start));
        tickCounter.incrementAndGet();
    }

    public Map<String, Double> collectData() {
        Map<String, Double> data = new HashMap<>();
        for (Sensor sensor : sensors) {
            data.put(sensor.getClass().getSimpleName(), sensor.read());
        }
        return data;
    }

    public void controlDevices() {
        // Reserved for control logic.
    }

    public void tickEnvironment() {
        simulationEngine.tick(room, electrodomestics, randomSource);
    }

    public void sendData(Map<String, Double> sensorData, long tickDurationMs) {
        Map<String, DeviceState> devices = new HashMap<>();
        Map<String, Integer> typeCounters = new HashMap<>();
        for (Electrodomestic d : electrodomestics) {
            int deviceIndex = typeCounters.merge(d.getType(), 1, Integer::sum);
            devices.put(
                    d.getType() + "#" + deviceIndex,
                    new DeviceState(d.isOn(), Map.of("state", d.getNormalizedState())));
        }

        TelemetryPayload payload = new TelemetryPayload(
                Instant.now(),
                emulatorId,
                tickDurationMs,
                telemetryQueue.size(),
                activeEmulatorCount,
                telemetryQueue.droppedCount(),
                new RoomStateSnapshot(
                        room.temperature(),
                        room.humidity(),
                        room.co2(),
                        room.pm25(),
                        room.dispersionRate(),
                        room.roomSquareMeters(),
                        room.windowCount()),
                sensorData,
                devices);
        telemetryQueue.offer(payload);
    }

    public EmulatorLifecycleState state() {
        return state;
    }

    /**
     * Get all electrodomestic devices (for actuator command processing)
     */
    public List<Electrodomestic> getElectrodomestics() {
        return List.copyOf(electrodomestics);
    }
}
