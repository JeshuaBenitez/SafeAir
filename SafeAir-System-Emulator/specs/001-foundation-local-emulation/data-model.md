# Data Model - 001-foundation-local-emulation

## Entity: EmulatorInstance

- Purpose: Runtime aggregate for one emulator loop under manager control.
- Fields:
- `emulatorId: String (EMU-0001)` (required, immutable identity)
- `tickIntervalMs: long` (required, > 0)
- `room: RoomState` (required)
- `sensors: List<Sensor>` (required, created via SensorFactory)
- `devices: List<Electrodomestic>` (required, created via ElectrodomesticFactory)
- `rngSeed: long` (derived from `emulatorId`)
- `lifecycleState: EmulatorLifecycleState` (`CREATED|CONFIGURED|RUNNING|STOPPING|STOPPED`)
- `droppedTelemetryCount: long` (monotonic, >= 0)
- Validation rules:
- `tickIntervalMs` must satisfy runtime constraints and be measurable against $\pm10\%$ tolerance.
- `sensors` and `devices` cannot include null entries.
- State transitions:
- `CREATED -> CONFIGURED -> RUNNING -> STOPPING -> STOPPED`
- Idempotent stop: `STOPPED -> STOPPED` allowed.

## Entity: RoomState

- Purpose: Environmental state at tick boundary for one room.
- Fields:
- `temperatureC: double`
- `humidityPct: double`
- `co2Ppm: double`
- `pm25UgM3: double`
- `roomSquareMeters: int`
- `windowCount: int`
- `dispersionRate: double` (random in [0.15, 0.20])
- Derived values:
- `areaFactor = sqrt(roomSquareMeters)`
- `windowFactor = 1 + (windowCount * 0.05)`
- `closedEnvironment = (windowCount == 0)`
- Validation rules:
- `roomSquareMeters > 0`
- `windowCount >= 0`
- `dispersionRate in [0.15, 0.20]`
- All emitted values must satisfy physical clamps defined by simulation constants.
- State transitions:
- `PRE_TICK -> POST_DISPERSION -> POST_EXCHANGE -> POST_ACTUATION -> POST_NOISE -> CLAMPED`

## Entity: DeviceState

- Purpose: Immutable device snapshot for telemetry and control traceability.
- Fields:
- `deviceType: enum`
- `isOn: boolean`
- `normalizedState: int`
- Validation rules:
- MiniSplit setpoint in [19,30]
- HumidifierPurifier level in [1,5]
- AirExtractor state in {0,1}

## Entity: TelemetryPayload

- Purpose: Immutable, enqueueable telemetry snapshot emitted by dispatcher.
- Fields:
- `eventId: String (EVT-000001)`
- `emulatorId: String (EMU-0001)`
- `tickNumber: long`
- `timestampUtc: Instant`
- `tickDurationMs: long`
- `tickIntervalMs: long`
- `timingWithinTolerance: boolean`
- `activeEmulatorCount: int`
- `queueSizeAtEnqueue: int`
- `droppedTelemetryCount: long`
- `roomState: RoomStateSnapshot`
- `sensorValues: Map<String, double>`
- `deviceStates: List<DeviceState>`
- Validation rules:
- Payload is immutable after construction.
- No references to mutable live domain objects are allowed.
- `queueSizeAtEnqueue` must be in [0,1024].

## Entity: SimulationParameters

- Purpose: Inputs controlling per-tick environmental and actuator behavior.
- Fields:
- `baseExchangeCoefficient: double`
- `maxTemperatureDeltaPerTick: double`
- `maxHumidityDeltaPerTick: double`
- `maxCo2DeltaPerTick: double`
- `maxPm25DeltaPerTick: double`
- `noiseBounds: NoiseBounds`
- Validation rules:
- All per-tick max deltas > 0.
- Noise bounds symmetric and finite.

## Relationships

- `EmulatorManager` aggregates many `EmulatorInstance`.
- `EmulatorInstance` owns one mutable `RoomState` and produces immutable `TelemetryPayload` snapshots.
- `TelemetryPayload` contains value snapshots (`RoomStateSnapshot`, `DeviceState`) only.
- `SimulationParameters` is consumed by simulation helpers; it does not own runtime entities.
