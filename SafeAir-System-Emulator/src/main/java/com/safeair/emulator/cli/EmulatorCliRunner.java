package com.safeair.emulator.cli;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;

import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.safeair.emulator.api.dto.ConfigCommand;
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
                    case "3" -> modifyBehavior(reader);
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
        System.out.println("3. Modificar comportamiento/configuracion");
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

    private void modifyBehavior(BufferedReader reader) throws Exception {
        System.out.println();
        System.out.println("1. Modificar un emulador");
        System.out.println("2. Modificar el conjunto completo");
        String option = readLine(reader, "Elige una opcion");
        if ("1".equals(option)) {
            modifySingleEmulator(reader);
            return;
        }
        if ("2".equals(option)) {
            modifyAllEmulators(reader);
            return;
        }
        System.out.println("Opcion invalida.");
    }

    private void modifySingleEmulator(BufferedReader reader) throws Exception {
        String emulatorId = readLine(reader, "ID del emulador");
        String action = chooseAction(reader);
        if (action == null) {
            return;
        }
        if ("room_config".equals(action)) {
            ConfigCommand command = buildConfigCommand(reader, ConfigCommand.Scope.EMULATOR, emulatorId);
            emulatorManager.applyConfig(command);
            System.out.println("Configuracion aplicada a " + emulatorId + ".");
            return;
        }
        executeBehavior(reader, emulatorId, action, false);
    }

    private void modifyAllEmulators(BufferedReader reader) throws Exception {
        String action = chooseAction(reader);
        if (action == null) {
            return;
        }
        if ("room_config".equals(action)) {
            ConfigCommand command = buildConfigCommand(reader, ConfigCommand.Scope.GLOBAL, null);
            emulatorManager.applyConfig(command);
            System.out.println("Configuracion global aplicada.");
            return;
        }
        executeBehavior(reader, null, action, true);
    }

    private String chooseAction(BufferedReader reader) throws Exception {
        System.out.println();
        System.out.println("1. Aplicar escenario");
        System.out.println("2. Ajustar variable ambiental");
        System.out.println("3. Pausar emulacion");
        System.out.println("4. Reanudar emulacion");
        System.out.println("5. Reconfigurar sala");
        String option = readLine(reader, "Selecciona una accion");
        return switch (option) {
            case "1" -> "scenario";
            case "2" -> "environment";
            case "3" -> "pause";
            case "4" -> "resume";
            case "5" -> "room_config";
            default -> null;
        };
    }

    private void executeBehavior(BufferedReader reader, String emulatorId, String action, boolean applyToAll) throws Exception {
        if ("scenario".equals(action)) {
            String scenario = readLine(reader, "Escenario (normal, hot-room, poor-air, high-humidity, high-co2)");
            if (applyToAll) {
                emulatorManager.applyScenarioToAll(scenario);
                System.out.println("Escenario aplicado a todos los emuladores.");
            } else {
                System.out.println("Resultado: " + emulatorManager.applyScenario(emulatorId, scenario));
            }
            return;
        }

        if ("pause".equals(action) || "resume".equals(action)) {
            if (applyToAll) {
                emulatorManager.applyBehaviorToAll(action, "");
                System.out.println("Accion aplicada a todos los emuladores.");
            } else {
                System.out.println("Resultado: " + emulatorManager.applyBehavior(emulatorId, action, ""));
            }
            return;
        }

        if ("environment".equals(action)) {
            System.out.println("1. set_temperature");
            System.out.println("2. set_humidity");
            System.out.println("3. set_co2");
            System.out.println("4. set_pm25");
            String variable = switch (readLine(reader, "Selecciona la variable")) {
                case "1" -> "set_temperature";
                case "2" -> "set_humidity";
                case "3" -> "set_co2";
                case "4" -> "set_pm25";
                default -> null;
            };
            if (variable == null) {
                System.out.println("Variable invalida.");
                return;
            }
            String value = readLine(reader, "Nuevo valor");
            if (applyToAll) {
                emulatorManager.applyBehaviorToAll(variable, value);
                System.out.println("Variable aplicada a todos los emuladores.");
            } else {
                System.out.println("Resultado: " + emulatorManager.applyBehavior(emulatorId, variable, value));
            }
        }
    }

    private ConfigCommand buildConfigCommand(BufferedReader reader, ConfigCommand.Scope scope, String emulatorId) throws Exception {
        Map<String, String> payload = new LinkedHashMap<>();
        payload.put("roomSquareMeters", readLine(reader, "Area de la sala en m2"));
        payload.put("windowCount", readLine(reader, "Numero de ventanas"));
        payload.put("updateIntervalSec", readLine(reader, "Intervalo de actualizacion en segundos"));
        payload.put("sensorTypes", readLine(reader, "Tipos de sensores CSV (1=Humidity,2=Temperature,3=PM25,4=CO2)"));
        payload.put("deviceTypes", readLine(reader, "Tipos de dispositivos CSV (1=MiniSplit,2=HumidifierPurifier,3=AirExtractor)"));
        payload.put("roomId", emulatorId == null ? "GLOBAL" : emulatorId);
        payload.put("roomName", emulatorId == null ? "CLI_GLOBAL" : "CLI_" + emulatorId);

        return new ConfigCommand(
                UUID.randomUUID().toString(),
                scope,
                emulatorId,
                null,
                System.nanoTime(),
                payload);
    }

    private String readLine(BufferedReader reader, String prompt) throws Exception {
        System.out.print(prompt + ": ");
        return reader.readLine();
    }
}
