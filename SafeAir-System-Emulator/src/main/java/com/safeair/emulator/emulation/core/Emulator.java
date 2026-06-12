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
import com.safeair.emulator.emulation.impl.AirExtractor;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.impl.MiniSplit;
import com.safeair.emulator.emulation.impl.SensorFactory;
import com.safeair.emulator.emulation.simulation.ConvergenceEvaluator;
import com.safeair.emulator.emulation.simulation.EmulatorSeedStrategy;
import com.safeair.emulator.emulation.simulation.RandomSource;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.emulation.simulation.SeededRandomSource;
import com.safeair.emulator.emulation.simulation.SimulationEngine;
import com.safeair.emulator.manager.ActuatorCommandResult;
import com.safeair.emulator.manager.ActuatorSnapshot;
import com.safeair.emulator.manager.EmulatorEventListener;
import com.safeair.emulator.manager.EmulatorLifecycleState;
import com.safeair.emulator.manager.EmulatorSnapshot;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class Emulator {
    private static final Logger LOGGER = LoggerFactory.getLogger(Emulator.class);
    
    private final String emulatorId;
    private final SensorFactory sensorFactory = new SensorFactory();
    private final ElectrodomesticFactory electrodomesticFactory = new ElectrodomesticFactory();
    private final AtomicLong tickCounter = new AtomicLong(0);
    private final EmulatorEventListener eventListener;

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
        this(emulatorId, telemetryQueue, EmulatorEventListener.NO_OP);
    }

    public Emulator(String emulatorId, TelemetryQueue telemetryQueue, EmulatorEventListener eventListener) {
        this.emulatorId = emulatorId;
        this.telemetryQueue = telemetryQueue;
        this.randomSource = new SeededRandomSource(EmulatorSeedStrategy.seedFrom(emulatorId));
        this.eventListener = eventListener == null ? EmulatorEventListener.NO_OP : eventListener;
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
        recordEvent("setup", "Configured room " + dto.roomSquareMeters() + "m2, windows=" + dto.windowCount()
                + ", interval=" + dto.updateIntervalSec() + "s");
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
        executor.scheduleAtFixedRate(this::safeTickCycle, 0, intervalMs, TimeUnit.MILLISECONDS);
        recordEvent("lifecycle", "Emulator started");
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
        recordEvent("lifecycle", "Emulator stopped");
    }

    public void setActiveEmulatorCount(int count) {
        this.activeEmulatorCount = count;
    }

    public synchronized String applyScenario(String scenario) {
        ensureRoomReady();
        String normalized = scenario == null ? "" : scenario.trim().toLowerCase();
        switch (normalized) {
            case "normal" -> {
                room.temperature(24.0);
                room.humidity(45.0);
                room.co2(500.0);
                room.pm25(10.0);
                room.externalTemperature(28.0);
                room.externalHumidity(55.0);
                room.externalCo2(420.0);
                room.externalPm25(12.0);
            }
            case "hot-room" -> {
                room.temperature(32.0);
                room.externalTemperature(38.0);
            }
            case "poor-air" -> {
                room.co2(950.0);
                room.pm25(85.0);
                room.externalCo2(900.0);
                room.externalPm25(80.0);
            }
            case "high-humidity" -> {
                room.humidity(76.0);
                room.externalHumidity(85.0);
            }
            case "high-co2" -> {
                room.co2(1200.0);
                room.externalCo2(1000.0);
            }
            default -> {
                return "unsupported_scenario";
            }
        }

        LOGGER.info("[{}] Scenario applied: {}", emulatorId, normalized);
        recordEvent("scenario", "Applied scenario " + normalized);
        return "ok";
    }

    public synchronized String applyBehaviorCommand(String action, String value) {
        ensureRoomReady();
        String normalized = action == null ? "" : action.trim().toLowerCase();
        switch (normalized) {
            case "set_temperature" -> room.temperature(DomainValidators.clamp(parseDouble(value, room.temperature()), DomainConstants.TEMP_MIN, DomainConstants.TEMP_MAX));
            case "set_humidity" -> room.humidity(DomainValidators.clamp(parseDouble(value, room.humidity()), DomainConstants.HUMIDITY_MIN, DomainConstants.HUMIDITY_MAX));
            case "set_co2" -> room.co2(Math.max(DomainConstants.CO2_MIN, parseDouble(value, room.co2())));
            case "set_pm25" -> room.pm25(Math.max(DomainConstants.PM25_MIN, parseDouble(value, room.pm25())));
            case "pause" -> stop();
            case "resume" -> start();
            default -> {
                return "unsupported_command";
            }
        }

        LOGGER.info("[{}] Behavior command applied: {}={}", emulatorId, normalized, value);
        recordEvent("behavior", "Applied behavior " + normalized + "=" + value);
        return "ok";
    }

    public synchronized void emitTelemetryNow() {
        ensureRoomReady();
        sendData(collectData(), 0);
    }

    private void ensureRoomReady() {
        if (room != null && simulationEngine != null) {
            return;
        }

        applySetup(new DtoSetup(
                emulatorId,
                5,
                35,
                1,
                new int[]{1, 2, 3, 4},
                new int[]{1, 2, 3}));
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
        String roomId = payload.getOrDefault("roomId", "unknown");
        String roomName = payload.getOrDefault("roomName", "unknown");
        LOGGER.debug("[{}] Received room config from API roomId={} roomName={}", emulatorId, roomId, roomName);

        try {
            // ── Parse numeric fields ────────────────────────────────────────────
            double roomSquareMeters = parseDouble(payload.get("roomSquareMeters"), 35.0);
            int windowCount = parseInt(payload.get("windowCount"), 0);
            int updateIntervalSec = parseInt(payload.get("updateIntervalSec"), 5);

            // ── Parse comma-separated arrays ───────────────────────────────────
            int[] sensorTypes = parseIntArray(payload.get("sensorTypes"), new int[]{1, 2, 3, 4});
            int[] deviceTypes = parseIntArray(payload.get("deviceTypes"), new int[]{1, 2, 3});

            // ── Log parsed values at DEBUG to keep the interactive CLI clean ──
            LOGGER.debug("[{}]   roomSquareMeters = {} m2", emulatorId, roomSquareMeters);
            LOGGER.debug("[{}]   windowCount      = {}", emulatorId, windowCount);
            LOGGER.debug("[{}]   updateIntervalSec= {}s", emulatorId, updateIntervalSec);
            LOGGER.debug("[{}]   sensorTypes      = {}", emulatorId, intsToString(sensorTypes));
            LOGGER.debug("[{}]   deviceTypes      = {}", emulatorId, intsToString(deviceTypes));

            // ── Count devices by type (for logging) ────────────────────────────
            int miniCount = 0, puriCount = 0, exCount = 0;
            for (int dt : deviceTypes) {
                if (dt == 1) miniCount++;
                else if (dt == 2) puriCount++;
                else if (dt == 3) exCount++;
            }
            LOGGER.debug("[{}]   minisplit(s)     = {}", emulatorId, miniCount);
            LOGGER.debug("[{}]   purifier(s)       = {}", emulatorId, puriCount);
            LOGGER.debug("[{}]   extractor(s)      = {}", emulatorId, exCount);
            recordEvent("config", "Received room config roomId=" + roomId
                    + " roomName=" + roomName
                    + " area=" + roomSquareMeters
                    + "m2 windows=" + windowCount
                    + " interval=" + updateIntervalSec
                    + "s devices=" + intsToString(deviceTypes));

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
                LOGGER.debug("[{}] Restarting telemetry loop with new interval: {}s", 
                        emulatorId, updateIntervalSec);
                recordEvent("config", "Restarting telemetry loop with interval " + updateIntervalSec + "s");
                executor = Executors.newScheduledThreadPool(1);
                long intervalMs = updateIntervalSec * 1000L;
                state = EmulatorLifecycleState.RUNNING;
                executor.scheduleAtFixedRate(this::safeTickCycle, 0, intervalMs, TimeUnit.MILLISECONDS);
            } else {
                LOGGER.debug("[{}] Room configured (telemetry loop not started yet, will start on next setup/start)", 
                        emulatorId);
            }

            LOGGER.debug("[{}] Dynamic room config applied successfully", emulatorId);
            recordEvent("config", "Dynamic room config applied");

        } catch (Exception e) {
            LOGGER.warn("[{}] Failed to apply room config: {}", emulatorId, e.getMessage());
            LOGGER.debug("[{}] Failed to apply room config", emulatorId, e);
            recordEvent("error", "Failed to apply room config: " + e.getMessage());
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
        long tick = tickCounter.incrementAndGet();
        recordEvent(
                "telemetry",
                "Tick " + tick + " temp=" + format(room.temperature())
                        + "C humidity=" + format(room.humidity())
                        + "% co2=" + format(room.co2())
                        + " ppm pm25=" + format(room.pm25()));
    }

    private void safeTickCycle() {
        try {
            tickCycle();
        } catch (RuntimeException ex) {
            LOGGER.warn("[{}] Telemetry tick failed: {}", emulatorId, ex.getMessage());
            LOGGER.debug("[{}] Telemetry tick failed", emulatorId, ex);
            recordEvent("error", "Telemetry tick failed: " + ex.getMessage());
        }
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

    public synchronized EmulatorSnapshot snapshot() {
        return new EmulatorSnapshot(
                emulatorId,
                state,
                room == null ? 0 : room.updateIntervalSec(),
                room == null ? 0 : room.roomSquareMeters(),
                room == null ? 0 : room.windowCount(),
                tickCounter.get(),
                telemetryQueue.size(),
                sensors.stream().map(sensor -> sensor.getClass().getSimpleName()).toList(),
                electrodomestics.stream().map(Electrodomestic::getType).toList());
    }

    public synchronized List<ActuatorSnapshot> actuatorSnapshots() {
        Map<String, Integer> typeCounters = new HashMap<>();
        return electrodomestics.stream()
                .map(device -> snapshotFor(device, typeCounters.merge(device.getType(), 1, Integer::sum)))
                .toList();
    }

    public synchronized ActuatorCommandResult applyActuatorCommand(
            String deviceType,
            int deviceIndex,
            String action,
            Integer value) {
        Electrodomestic device = findActuator(deviceType, deviceIndex);
        if (device == null) {
            return ActuatorCommandResult.error("device_not_found");
        }

        try {
            switch (action) {
                case "turn_on" -> turnOn(device);
                case "turn_off" -> turnOff(device);
                case "set_temperature" -> {
                    if (!(device instanceof MiniSplit)) {
                        return ActuatorCommandResult.error("unsupported_action");
                    }
                    device.setState(requireValue(value));
                }
                case "set_state" -> {
                    if (!(device instanceof AirExtractor)) {
                        return ActuatorCommandResult.error("unsupported_action");
                    }
                    device.setState(requireValue(value));
                }
                case "set_level" -> {
                    if (!(device instanceof HumidifierPurifier)) {
                        return ActuatorCommandResult.error("unsupported_action");
                    }
                    device.setState(requireValue(value));
                }
                default -> {
                    return ActuatorCommandResult.error("unsupported_action");
                }
            }
        } catch (IllegalArgumentException ex) {
            return ActuatorCommandResult.error("value_out_of_range");
        }

        emitTelemetryNow();
        ActuatorSnapshot snapshot = snapshotFor(device, deviceIndex);
        recordEvent(
                "actuator",
                "Applied " + action + " to " + snapshot.deviceType() + "#" + snapshot.deviceIndex()
                        + " on=" + snapshot.on() + " state=" + snapshot.state());
        return ActuatorCommandResult.ok(snapshot);
    }

    /**
     * Get all electrodomestic devices (for actuator command processing)
     */
    public List<Electrodomestic> getElectrodomestics() {
        return List.copyOf(electrodomestics);
    }

    private Electrodomestic findActuator(String deviceType, int deviceIndex) {
        String normalizedType = normalizeDeviceType(deviceType);
        int currentIndex = 0;
        for (Electrodomestic device : electrodomestics) {
            if (!normalizeDeviceType(device.getType()).equals(normalizedType)) {
                continue;
            }
            currentIndex++;
            if (currentIndex == deviceIndex) {
                return device;
            }
        }
        return null;
    }

    private ActuatorSnapshot snapshotFor(Electrodomestic device, int deviceIndex) {
        return new ActuatorSnapshot(
                normalizeDeviceType(device.getType()),
                deviceIndex,
                device.isOn(),
                device.getNormalizedState());
    }

    private void turnOn(Electrodomestic device) {
        if (device instanceof AirExtractor) {
            device.setState(DomainConstants.AIR_EXTRACTOR_ON);
            return;
        }
        if (!device.isOn()) {
            device.toggle();
        }
    }

    private void turnOff(Electrodomestic device) {
        if (device instanceof AirExtractor) {
            device.setState(DomainConstants.AIR_EXTRACTOR_OFF);
            return;
        }
        if (device.isOn()) {
            device.toggle();
        }
    }

    private int requireValue(Integer value) {
        if (value == null) {
            throw new IllegalArgumentException("value required");
        }
        return value;
    }

    private String normalizeDeviceType(String type) {
        String normalized = type == null ? "" : type.trim().toLowerCase();
        if (normalized.contains("minisplit")) {
            return "minisplit";
        }
        if (normalized.contains("humidifierpurifier") || normalized.contains("purifier")) {
            return "purifier";
        }
        if (normalized.contains("airextractor") || normalized.contains("extractor")) {
            return "extractor";
        }
        return normalized;
    }

    private void recordEvent(String category, String message) {
        eventListener.onEvent(emulatorId, category, message);
    }

    private String format(double value) {
        return String.format("%.2f", value);
    }
}
