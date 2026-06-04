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

public class Emulator {
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

    public synchronized void applyConfig(ConfigCommand command) {
        if (command == null || command.payload().isEmpty()) {
            return;
        }
        applyDeviceState("MiniSplit", command.payload().get("minisplitState"));
        applyDeviceState("HumidifierPurifier", command.payload().get("humidifierState"));
        applyDeviceState("AirExtractor", command.payload().get("airExtractorState"));
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
        for (Electrodomestic d : electrodomestics) {
            devices.put(d.getType(), new DeviceState(d.isOn(), Map.of("state", d.getNormalizedState())));
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
}
