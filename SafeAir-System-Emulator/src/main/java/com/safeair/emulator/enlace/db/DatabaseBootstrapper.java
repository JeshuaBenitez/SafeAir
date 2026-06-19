package com.safeair.emulator.enlace.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public class DatabaseBootstrapper {

    public void initializeAll() throws Exception {
        initializePostgreSql();
        initializeMariaDb();
        initializeSqlServer();
    }

    public void initializePostgreSql() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.postgresql();
        createPostgresDatabaseIfMissing(info);
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            SqlScriptRunner.runClasspathScript(connection, DatabaseTarget.POSTGRESQL, "/db/enlace/postgresql.sql");
        }
    }

    public void initializeMariaDb() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.mariadb();
        createMariaDatabaseIfMissing(info);
        try (Connection connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password())) {
            SqlScriptRunner.runClasspathScript(connection, DatabaseTarget.MARIADB, "/db/enlace/mariadb.sql");
        }
    }

    public void initializeSqlServer() throws Exception {
        DatabaseConnectionInfo info = EnlaceDatabaseConfig.sqlServer();
        try (Connection connection = DriverManager.getConnection(
                info.adminJdbcUrl(),
                info.user(),
                info.password())) {
            SqlScriptRunner.runClasspathScript(connection, DatabaseTarget.SQLSERVER, "/db/enlace/sqlserver.sql");
        }
    }

    private void createPostgresDatabaseIfMissing(DatabaseConnectionInfo info) throws SQLException {
        try (Connection admin = DriverManager.getConnection(info.adminJdbcUrl(), info.user(), info.password());
                PreparedStatementWrapper exists = new PreparedStatementWrapper(
                        admin,
                        "SELECT 1 FROM pg_database WHERE datname = ?",
                        info.database())) {
            if (!exists.hasRow()) {
                try (Statement statement = admin.createStatement()) {
                    statement.executeUpdate("CREATE DATABASE " + quoteIdentifier(info.database()));
                }
            }
        }
    }

    private void createMariaDatabaseIfMissing(DatabaseConnectionInfo info) throws SQLException {
        try (Connection admin = DriverManager.getConnection(info.adminJdbcUrl(), info.user(), info.password());
                Statement statement = admin.createStatement()) {
            statement.executeUpdate("CREATE DATABASE IF NOT EXISTS " + mariaIdentifier(info.database())
                    + " CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }
    }

    private String quoteIdentifier(String identifier) {
        return "\"" + identifier.replace("\"", "\"\"") + "\"";
    }

    private String mariaIdentifier(String identifier) {
        return "`" + identifier.replace("`", "``") + "`";
    }

    private static final class PreparedStatementWrapper implements AutoCloseable {
        private final java.sql.PreparedStatement statement;

        private PreparedStatementWrapper(Connection connection, String sql, String value) throws SQLException {
            statement = connection.prepareStatement(sql);
            statement.setString(1, value);
        }

        private boolean hasRow() throws SQLException {
            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }
        }

        @Override
        public void close() throws SQLException {
            statement.close();
        }
    }
}
