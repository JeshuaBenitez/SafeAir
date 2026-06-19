package com.safeair.emulator.enlace;

import com.safeair.emulator.enlace.db.DatabaseBootstrapper;
import com.safeair.emulator.enlace.db.DatabaseConnectionInfo;
import com.safeair.emulator.enlace.db.EnlaceDatabaseConfig;
import com.safeair.emulator.enlace.db.NormalizedReplicator;
import com.safeair.emulator.enlace.excel.ImportadorEnlace;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;

public final class EnlaceDatabaseTool {

    private static final List<String> TABLES = List.of(
            "entidad",
            "municipio",
            "localidad",
            "nivel_educativo",
            "turno",
            "tipo_escuela",
            "grado_marginacion",
            "escuela",
            "grado",
            "materia",
            "nivel_logro",
            "resultado_promedio",
            "resultado_logro",
            "alumnos_evaluados",
            "alumnos_resultado_poco_confiable",
            "validacion_error"
    );

    private EnlaceDatabaseTool() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length == 0 || "help".equalsIgnoreCase(args[0])) {
            printHelp();
            return;
        }
        switch (args[0].toLowerCase()) {
            case "init" -> init();
            case "populate" -> populate(args);
            case "replicate" -> replicate();
            case "validate" -> validate();
            case "status" -> status();
            case "controlled-invalid-test" -> controlledInvalidTest();
            default -> {
                System.err.println("Comando no reconocido: " + args[0]);
                printHelp();
                System.exit(2);
            }
        }
    }

    private static void init() throws Exception {
        DatabaseBootstrapper bootstrapper = new DatabaseBootstrapper();
        bootstrapper.initializeAll();
        System.out.println("Estructuras ENLACE inicializadas en PostgreSQL, MariaDB y SQL Server.");
    }

    private static void populate(String[] args) throws Exception {
        String excel = args.length > 1
                ? String.join(" ", java.util.Arrays.copyOfRange(args, 1, args.length))
                : "/home/jbenitez/BD/Procedimientos Almacenados/ENLACE.xls";
        new ImportadorEnlace().importar(excel);
    }

    private static void replicate() throws Exception {
        new NormalizedReplicator().replicate();
        System.out.println("Replicacion PostgreSQL -> MariaDB/SQL Server finalizada.");
    }

    private static void validate() throws Exception {
        callValidation(EnlaceDatabaseConfig.postgresql(), "CALL validar_base_enlace()");
        callValidation(EnlaceDatabaseConfig.mariadb(), "CALL validar_base_enlace()");
        callValidation(EnlaceDatabaseConfig.sqlServer(), "EXEC dbo.validar_base_enlace");
        System.out.println("Validaciones ejecutadas en los tres gestores.");
    }

    private static void status() throws Exception {
        printCounts("PostgreSQL", EnlaceDatabaseConfig.postgresql(), false);
        printCounts("MariaDB", EnlaceDatabaseConfig.mariadb(), false);
        printCounts("SQL Server", EnlaceDatabaseConfig.sqlServer(), true);
    }

    private static void controlledInvalidTest() throws Exception {
        controlledInvalidPostgres();
        controlledInvalidMariaDb();
        controlledInvalidSqlServer();
    }

    private static void callValidation(DatabaseConnectionInfo info, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password());
                Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private static void printCounts(String label, DatabaseConnectionInfo info, boolean sqlServer) {
        System.out.println("== " + label + " ==");
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            for (String table : TABLES) {
                String qualified = sqlServer ? "dbo." + table : table;
                try (Statement statement = connection.createStatement();
                        ResultSet resultSet = statement.executeQuery("SELECT COUNT(*) FROM " + qualified)) {
                    resultSet.next();
                    System.out.println(table + ": " + resultSet.getLong(1));
                }
            }
        } catch (Exception e) {
            System.out.println("No disponible: " + e.getMessage());
        }
    }

    private static void controlledInvalidPostgres() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.postgresql();
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO grado_marginacion (nombre_grado_marginacion) VALUES ('EXTREMO')");
                statement.execute("CALL validar_base_enlace()");
                long errors = validationCount(connection, "validar_grado_marginacion", false);
                System.out.println("PostgreSQL prueba EXTREMO -> errores: " + errors);
            } finally {
                connection.rollback();
            }
        }
    }

    private static void controlledInvalidMariaDb() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.mariadb();
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO grado_marginacion (nombre_grado_marginacion) VALUES ('EXTREMO')");
                statement.execute("CALL validar_base_enlace()");
                long errors = validationCount(connection, "validar_grado_marginacion", false);
                System.out.println("MariaDB prueba EXTREMO -> errores: " + errors);
            } finally {
                connection.rollback();
            }
        }
    }

    private static void controlledInvalidSqlServer() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.sqlServer();
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO dbo.grado_marginacion (nombre_grado_marginacion) VALUES ('EXTREMO')");
                statement.execute("EXEC dbo.validar_base_enlace");
                long errors = validationCount(connection, "validar_grado_marginacion", true);
                System.out.println("SQL Server prueba EXTREMO -> errores: " + errors);
            } finally {
                connection.rollback();
            }
        }
    }

    private static long validationCount(Connection connection, String validationName, boolean sqlServer) throws Exception {
        String table = sqlServer ? "dbo.validacion_error" : "validacion_error";
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM " + table + " WHERE nombre_validacion = ?")) {
            statement.setString(1, validationName);
            try (ResultSet resultSet = statement.executeQuery()) {
                resultSet.next();
                return resultSet.getLong(1);
            }
        }
    }

    private static void printHelp() {
        System.out.println("""
                Uso:
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="init"
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="populate /ruta/ENLACE.xls"
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="replicate"
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="validate"
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="status"
                  mvn -DskipTests exec:java -Dexec.mainClass=com.safeair.emulator.enlace.EnlaceDatabaseTool -Dexec.args="controlled-invalid-test"
                """);
    }
}
