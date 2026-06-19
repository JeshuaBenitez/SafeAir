package com.safeair.emulator.enlace.db;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public final class SqlScriptRunner {

    private SqlScriptRunner() {
    }

    public static void runClasspathScript(Connection connection, DatabaseTarget target, String resource)
            throws IOException, SQLException {
        String script = readResource(resource);
        for (String statement : split(script, target)) {
            if (!statement.isBlank()) {
                try (Statement sql = connection.createStatement()) {
                    sql.execute(statement);
                }
            }
        }
    }

    private static String readResource(String resource) throws IOException {
        try (InputStream input = SqlScriptRunner.class.getResourceAsStream(resource)) {
            if (input == null) {
                throw new IOException("No existe el recurso SQL: " + resource);
            }
            return new String(input.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static List<String> split(String script, DatabaseTarget target) {
        String normalized = script.replace("\r\n", "\n");
        if (target == DatabaseTarget.SQLSERVER) {
            return splitByGo(normalized);
        }
        if (target == DatabaseTarget.MARIADB) {
            return splitMariaDb(normalized);
        }
        return splitBySemicolon(normalized);
    }

    private static List<String> splitByGo(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String line : script.split("\n")) {
            if ("GO".equalsIgnoreCase(line.trim())) {
                statements.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(line).append('\n');
            }
        }
        statements.add(current.toString().trim());
        return statements;
    }

    private static List<String> splitMariaDb(String script) {
        List<String> statements = new ArrayList<>();
        String delimiter = ";";
        StringBuilder current = new StringBuilder();
        for (String line : script.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.toUpperCase().startsWith("DELIMITER ")) {
                delimiter = trimmed.substring("DELIMITER ".length()).trim();
                continue;
            }
            current.append(line).append('\n');
            if (current.toString().trim().endsWith(delimiter)) {
                String statement = current.toString().trim();
                statements.add(statement.substring(0, statement.length() - delimiter.length()).trim());
                current.setLength(0);
            }
        }
        if (!current.toString().isBlank()) {
            statements.add(current.toString().trim());
        }
        return statements;
    }

    private static List<String> splitBySemicolon(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean dollarQuote = false;
        for (String line : script.split("\n")) {
            if (line.contains("$$")) {
                dollarQuote = !dollarQuote;
            }
            current.append(line).append('\n');
            if (!dollarQuote && line.trim().endsWith(";")) {
                String statement = current.toString().trim();
                statements.add(statement.substring(0, statement.length() - 1).trim());
                current.setLength(0);
            }
        }
        if (!current.toString().isBlank()) {
            statements.add(current.toString().trim());
        }
        return statements;
    }
}
