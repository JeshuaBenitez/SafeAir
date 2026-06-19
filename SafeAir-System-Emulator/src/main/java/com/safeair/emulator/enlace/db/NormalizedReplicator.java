package com.safeair.emulator.enlace.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class NormalizedReplicator {

    private static final List<TableSpec> TABLES = List.of(
            new TableSpec("entidad", "id_entidad"),
            new TableSpec("municipio", "id_municipio"),
            new TableSpec("localidad", "id_localidad"),
            new TableSpec("nivel_educativo", "id_nivel_educativo"),
            new TableSpec("turno", "id_turno"),
            new TableSpec("tipo_escuela", "id_tipo_escuela"),
            new TableSpec("grado_marginacion", "id_grado_marginacion"),
            new TableSpec("materia", "id_materia"),
            new TableSpec("nivel_logro", "id_nivel_logro"),
            new TableSpec("grado", "id_grado"),
            new TableSpec("escuela", "id_escuela"),
            new TableSpec("resultado_promedio", "id_resultado_promedio"),
            new TableSpec("resultado_logro", "id_resultado_logro"),
            new TableSpec("alumnos_evaluados", "id_alumnos_evaluados"),
            new TableSpec("alumnos_resultado_poco_confiable", "id_alumnos_poco_confiable")
    );

    public void replicate() throws Exception {
        DatabaseConnectionInfo pgInfo = EnlaceDatabaseConfig.postgresql();
        DatabaseConnectionInfo mariaInfo = EnlaceDatabaseConfig.mariadb();
        DatabaseConnectionInfo sqlServerInfo = EnlaceDatabaseConfig.sqlServer();
        try (Connection postgres = DriverManager.getConnection(pgInfo.jdbcUrl(), pgInfo.user(), pgInfo.password());
                Connection mariadb = DriverManager.getConnection(
                        mariaInfo.jdbcUrl(), mariaInfo.user(), mariaInfo.password());
                Connection sqlServer = DriverManager.getConnection(
                        sqlServerInfo.jdbcUrl(), sqlServerInfo.user(), sqlServerInfo.password())) {
            mariadb.setAutoCommit(false);
            sqlServer.setAutoCommit(false);
            try {
                cleanMariaDb(mariadb);
                cleanSqlServer(sqlServer);
                replicateToMariaDb(postgres, mariadb);
                replicateToSqlServer(postgres, sqlServer);
                mariadb.commit();
                sqlServer.commit();
            } catch (Exception e) {
                mariadb.rollback();
                sqlServer.rollback();
                throw e;
            }
        }
    }

    private void cleanMariaDb(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            statement.execute("SET FOREIGN_KEY_CHECKS = 0");
            for (int i = TABLES.size() - 1; i >= 0; i--) {
                statement.executeUpdate("DELETE FROM " + TABLES.get(i).name());
            }
            statement.execute("SET FOREIGN_KEY_CHECKS = 1");
        }
    }

    private void cleanSqlServer(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement()) {
            for (int i = TABLES.size() - 1; i >= 0; i--) {
                statement.executeUpdate("DELETE FROM dbo." + TABLES.get(i).name());
            }
        }
    }

    private void replicateToMariaDb(Connection origin, Connection destination) throws Exception {
        for (TableSpec table : TABLES) {
            List<String> columns = columns(origin, table.name());
            int copied = copyTable(
                    origin,
                    destination,
                    selectSql(table.name(), columns),
                    insertSql(table.name(), columns, false),
                    columns);
            System.out.println("MariaDB <- " + table.name() + ": " + copied + " registros");
        }
    }

    private void replicateToSqlServer(Connection origin, Connection destination) throws Exception {
        for (TableSpec table : TABLES) {
            List<String> columns = columns(origin, table.name());
            try (Statement statement = destination.createStatement()) {
                statement.execute("SET IDENTITY_INSERT dbo." + table.name() + " ON");
            }
            int copied = copyTable(
                    origin,
                    destination,
                    selectSql(table.name(), columns),
                    insertSql(table.name(), columns, true),
                    columns);
            try (Statement statement = destination.createStatement()) {
                statement.execute("SET IDENTITY_INSERT dbo." + table.name() + " OFF");
            }
            System.out.println("SQL Server <- " + table.name() + ": " + copied + " registros");
        }
    }

    private int copyTable(
            Connection origin,
            Connection destination,
            String selectSql,
            String insertSql,
            List<String> columns
    ) throws Exception {
        int copied = 0;
        try (Statement originStatement = origin.createStatement();
                ResultSet resultSet = originStatement.executeQuery(selectSql);
                PreparedStatement destinationStatement = destination.prepareStatement(insertSql)) {
            while (resultSet.next()) {
                for (int i = 0; i < columns.size(); i++) {
                    destinationStatement.setObject(i + 1, resultSet.getObject(columns.get(i)));
                }
                destinationStatement.executeUpdate();
                copied++;
            }
        }
        return copied;
    }

    private List<String> columns(Connection postgres, String table) throws Exception {
        String sql = """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ?
                ORDER BY ordinal_position
                """;
        List<String> columns = new ArrayList<>();
        try (PreparedStatement statement = postgres.prepareStatement(sql)) {
            statement.setString(1, table);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    columns.add(resultSet.getString("column_name"));
                }
            }
        }
        if (columns.isEmpty()) {
            throw new IllegalStateException("No se encontraron columnas para la tabla " + table);
        }
        return columns;
    }

    private String selectSql(String table, List<String> columns) {
        return "SELECT " + String.join(", ", columns) + " FROM " + table + " ORDER BY 1";
    }

    private String insertSql(String table, List<String> columns, boolean sqlServer) {
        String prefix = sqlServer ? "dbo." : "";
        return "INSERT INTO " + prefix + table + " (" + String.join(", ", columns) + ") VALUES ("
                + "?,".repeat(columns.size()).replaceFirst(",$", "") + ")";
    }

    private record TableSpec(String name, String idColumn) {
    }
}
