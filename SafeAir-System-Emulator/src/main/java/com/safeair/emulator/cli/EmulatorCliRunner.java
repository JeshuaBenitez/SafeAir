package com.safeair.emulator.cli;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.safeair.emulator.manager.ActuatorCommandResult;
import com.safeair.emulator.manager.ActuatorSnapshot;
import com.safeair.emulator.manager.EmulatorLogEntry;
import com.safeair.emulator.manager.EmulatorLogStore;
import com.safeair.emulator.manager.EmulatorManager;
import com.safeair.emulator.manager.EmulatorSnapshot;

@Component
public class EmulatorCliRunner implements ApplicationRunner, DisposableBean {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());
    private static final int LOG_LIMIT = 2_000;

    private final EmulatorManager emulatorManager;
    private final EmulatorLogStore logStore;
    private final ExecutorService executorService;
    private final boolean cliEnabled;
    private volatile boolean running = true;
    private Future<?> cliTask;

    public EmulatorCliRunner(
            EmulatorManager emulatorManager,
            EmulatorLogStore logStore,
            @Qualifier("emulatorManagerExecutor") ExecutorService executorService,
            @Value("${safeair.cli.enabled:true}") boolean cliEnabled) {
        this.emulatorManager = emulatorManager;
        this.logStore = logStore;
        this.executorService = executorService;
        this.cliEnabled = cliEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!cliEnabled) {
            return;
        }
        if (System.console() == null) {
            System.out.println("[SafeAir CLI] Consola interactiva no disponible; la CLI se omitio.");
            return;
        }
        cliTask = executorService.submit(this::cliLoop);
    }

    @Override
    public void destroy() {
        running = false;
        if (cliTask != null) {
            cliTask.cancel(true);
        }
    }

    private void cliLoop() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
            printWelcome();
            while (running) {
                printMainMenu();
                String option = readLine(reader, "Selecciona una opcion");
                if (option == null) {
                    return;
                }
                switch (option) {
                    case "1" -> showEmulators();
                    case "2" -> showLogs(reader);
                    case "3" -> controlActuators(reader);
                    case "0" -> {
                        System.out.println("CLI finalizada.");
                        return;
                    }
                    default -> System.out.println("Opcion invalida.");
                }
            }
        } catch (Exception ex) {
            System.out.println("[SafeAir CLI] Error: " + ex.getMessage());
        }
    }

    private void printWelcome() {
        System.out.println();
        System.out.println("=== SafeAir CLI ===");
        System.out.println("Emuladores activos: " + emulatorManager.getEmulatorCount());
    }

    private void printMainMenu() {
        System.out.println();
        System.out.println("1. Listar emuladores");
        System.out.println("2. Ver logs");
        System.out.println("3. Controlar actuadores");
        System.out.println("0. Salir");
    }

    private void showEmulators() {
        List<EmulatorSnapshot> snapshots = emulatorManager.listSnapshots();
        if (snapshots.isEmpty()) {
            System.out.println("No hay emuladores registrados.");
            return;
        }

        System.out.println();
        System.out.println("Listado de emuladores:");
        for (EmulatorSnapshot snapshot : snapshots) {
            System.out.println("- ID: " + snapshot.emulatorId()
                    + " | estado=" + snapshot.state()
                    + " | intervalo=" + snapshot.updateIntervalSec() + "s"
                    + " | area=" + snapshot.roomSquareMeters() + "m2"
                    + " | ventanas=" + snapshot.windowCount()
                    + " | ticks=" + snapshot.tickCount()
                    + " | cola=" + snapshot.telemetryQueueSize());
            System.out.println("  sensores=" + String.join(", ", snapshot.sensors()));
            System.out.println("  dispositivos=" + String.join(", ", snapshot.devices()));
        }
    }

    private void showLogs(BufferedReader reader) throws Exception {
        System.out.println();
        System.out.println("1. Ver logs de un emulador");
        System.out.println("2. Ver logs de todos");
        String option = readLine(reader, "Elige una opcion");
        if ("1".equals(option)) {
            String emulatorId = readLine(reader, "ID del emulador");
            printLogs(logStore.findByEmulator(emulatorId, LOG_LIMIT));
            return;
        }
        if ("2".equals(option)) {
            printLogs(logStore.findAllOrdered(LOG_LIMIT));
            return;
        }
        System.out.println("Opcion invalida.");
    }

    private void printLogs(List<EmulatorLogEntry> entries) {
        if (entries.isEmpty()) {
            System.out.println("No hay logs disponibles.");
            return;
        }

        System.out.println();
        System.out.println("Logs:");
        for (EmulatorLogEntry entry : entries) {
            System.out.println("[" + DATE_FORMATTER.format(entry.timestamp()) + "] "
                    + "[" + entry.emulatorId() + "] "
                    + "[" + entry.category() + "] "
                    + entry.message());
        }
    }

    private void controlActuators(BufferedReader reader) throws Exception {
        String emulatorId = chooseEmulator(reader);
        if (emulatorId == null) {
            return;
        }

        ActuatorSnapshot actuator = chooseActuator(reader, emulatorId);
        if (actuator == null) {
            return;
        }

        runActuatorAction(reader, emulatorId, actuator);
    }

    private String chooseEmulator(BufferedReader reader) throws Exception {
        List<EmulatorSnapshot> snapshots = emulatorManager.listSnapshots();
        if (snapshots.isEmpty()) {
            System.out.println("No hay emuladores registrados.");
            return null;
        }

        System.out.println();
        System.out.println("Selecciona un emulador:");
        for (int i = 0; i < snapshots.size(); i++) {
            EmulatorSnapshot snapshot = snapshots.get(i);
            System.out.println((i + 1) + ". " + snapshot.emulatorId() + " [" + snapshot.state() + "]");
        }
        System.out.println("0. Volver");

        Integer option = readInt(reader, "Selecciona un emulador");
        if (option == null || option == 0) {
            return null;
        }
        if (option < 1 || option > snapshots.size()) {
            System.out.println("Opcion invalida.");
            return null;
        }

        String emulatorId = snapshots.get(option - 1).emulatorId();
        if (emulatorManager.getEmulator(emulatorId) == null) {
            System.out.println("Emulador no encontrado.");
            return null;
        }
        return emulatorId;
    }

    private ActuatorSnapshot chooseActuator(BufferedReader reader, String emulatorId) throws Exception {
        List<ActuatorSnapshot> actuators = emulatorManager.listActuators(emulatorId);
        if (actuators.isEmpty()) {
            System.out.println("No hay dispositivos disponibles en este emulador.");
            return null;
        }

        System.out.println();
        System.out.println("Selecciona dispositivo:");
        for (int i = 0; i < actuators.size(); i++) {
            System.out.println((i + 1) + ". " + formatActuator(actuators.get(i)));
        }
        System.out.println("0. Volver");

        Integer option = readInt(reader, "Selecciona un dispositivo");
        if (option == null || option == 0) {
            return null;
        }
        if (option < 1 || option > actuators.size()) {
            System.out.println("Opcion invalida.");
            return null;
        }
        return actuators.get(option - 1);
    }

    private void runActuatorAction(BufferedReader reader, String emulatorId, ActuatorSnapshot actuator) throws Exception {
        System.out.println();
        System.out.println("Estado actual:");
        System.out.println(formatActuator(actuator));
        printActuatorActions(actuator);

        Integer option = readInt(reader, "Selecciona una accion");
        if (option == null || option == 0) {
            return;
        }

        String action;
        Integer value = null;
        if (option == 1) {
            action = "turn_on";
        } else if (option == 2) {
            action = "turn_off";
        } else if (option == 3 && supportsStateChange(actuator)) {
            action = stateActionFor(actuator);
            value = readStateValue(reader, actuator);
            if (value == null) {
                return;
            }
        } else if ((option == 3 && !supportsStateChange(actuator)) || option == 4) {
            printLatestActuatorState(emulatorId, actuator);
            return;
        } else {
            System.out.println("Opcion invalida.");
            return;
        }

        ActuatorCommandResult result = emulatorManager.applyActuatorCommand(
                emulatorId,
                actuator.deviceType(),
                actuator.deviceIndex(),
                action,
                value);
        if (!result.success()) {
            printActuatorError(result.message());
            return;
        }

        System.out.println("Cambio aplicado correctamente.");
        System.out.println("Cambio aplicado:");
        System.out.println(formatActuator(result.snapshot()));
    }

    private void printActuatorActions(ActuatorSnapshot actuator) {
        System.out.println();
        System.out.println("Acciones disponibles para " + actuatorLabel(actuator) + ":");
        System.out.println("1. Encender");
        System.out.println("2. Apagar");
        if ("minisplit".equals(actuator.deviceType())) {
            System.out.println("3. Cambiar temperatura objetivo");
        } else if ("purifier".equals(actuator.deviceType())) {
            System.out.println("3. Cambiar nivel (1-5)");
        }
        System.out.println((supportsStateChange(actuator) ? "4" : "3") + ". Mostrar estado actual");
        System.out.println("0. Volver");
    }

    private boolean supportsStateChange(ActuatorSnapshot actuator) {
        return "minisplit".equals(actuator.deviceType()) || "purifier".equals(actuator.deviceType());
    }

    private Integer readStateValue(BufferedReader reader, ActuatorSnapshot actuator) throws Exception {
        return switch (actuator.deviceType()) {
            case "minisplit" -> readIntInRange(reader, "Temperatura objetivo (19-30)", 19, 30);
            case "extractor" -> readIntInRange(reader, "Estado (0=OFF, 1=ON)", 0, 1);
            case "purifier" -> readIntInRange(reader, "Nivel (1-5)", 1, 5);
            default -> null;
        };
    }

    private String stateActionFor(ActuatorSnapshot actuator) {
        return switch (actuator.deviceType()) {
            case "minisplit" -> "set_temperature";
            case "extractor" -> "set_state";
            case "purifier" -> "set_level";
            default -> "";
        };
    }

    private void printLatestActuatorState(String emulatorId, ActuatorSnapshot actuator) {
        List<ActuatorSnapshot> current = emulatorManager.listActuators(emulatorId);
        current.stream()
                .filter(item -> item.deviceType().equals(actuator.deviceType())
                        && item.deviceIndex() == actuator.deviceIndex())
                .findFirst()
                .ifPresentOrElse(
                        item -> System.out.println(formatActuator(item)),
                        () -> System.out.println("Dispositivo no disponible en este emulador."));
    }

    private String formatActuator(ActuatorSnapshot actuator) {
        return actuatorLabel(actuator)
                + " ["
                + (actuator.on() ? "ON" : "OFF")
                + ", "
                + stateLabel(actuator)
                + "="
                + actuator.state()
                + "]";
    }

    private String actuatorLabel(ActuatorSnapshot actuator) {
        return switch (actuator.deviceType()) {
            case "minisplit" -> "MiniSplit#" + actuator.deviceIndex();
            case "extractor" -> "AirExtractor#" + actuator.deviceIndex();
            case "purifier" -> "HumidifierPurifier#" + actuator.deviceIndex();
            default -> actuator.deviceType() + "#" + actuator.deviceIndex();
        };
    }

    private String stateLabel(ActuatorSnapshot actuator) {
        return switch (actuator.deviceType()) {
            case "minisplit" -> "setpoint";
            case "extractor" -> "state";
            case "purifier" -> "level";
            default -> "state";
        };
    }

    private void printActuatorError(String message) {
        switch (message) {
            case "emulator_not_found" -> System.out.println("Emulador no encontrado.");
            case "device_not_found" -> System.out.println("Dispositivo no disponible en este emulador.");
            case "value_out_of_range" -> System.out.println("Valor fuera de rango.");
            default -> System.out.println("No se pudo aplicar el cambio: " + message);
        }
    }

    private Integer readInt(BufferedReader reader, String prompt) throws Exception {
        String value = readLine(reader, prompt);
        if (value == null || value.isBlank()) {
            System.out.println("Entrada vacia.");
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            System.out.println("Entrada no numerica.");
            return null;
        }
    }

    private Integer readIntInRange(BufferedReader reader, String prompt, int min, int max) throws Exception {
        Integer value = readInt(reader, prompt);
        if (value == null) {
            return null;
        }
        if (value < min || value > max) {
            System.out.println("Valor fuera de rango.");
            return null;
        }
        return value;
    }

    private String readLine(BufferedReader reader, String prompt) throws Exception {
        System.out.print(prompt + ": ");
        return reader.readLine();
    }
}
