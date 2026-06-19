package com.safeair.emulator.enlace.db;

public final class EnlaceDatabaseConfig {

    private EnlaceDatabaseConfig() {
    }

    public static DatabaseConnectionInfo postgresql() {
        return new DatabaseConnectionInfo(
                DatabaseTarget.POSTGRESQL,
                env("ENLACE_POSTGRES_HOST", "localhost"),
                intEnv("ENLACE_POSTGRES_PORT", 6543),
                env("ENLACE_POSTGRES_DB", "enlace"),
                env("ENLACE_POSTGRES_USER", "postgres"),
                env("ENLACE_POSTGRES_PASSWORD", "1234567890")
        );
    }

    public static DatabaseConnectionInfo mariadb() {
        return new DatabaseConnectionInfo(
                DatabaseTarget.MARIADB,
                env("ENLACE_MARIADB_HOST", "localhost"),
                intEnv("ENLACE_MARIADB_PORT", 3307),
                env("ENLACE_MARIADB_DB", "enlace_mariadb"),
                env("ENLACE_MARIADB_USER", "mariadb"),
                env("ENLACE_MARIADB_PASSWORD", "1234567890")
        );
    }

    public static DatabaseConnectionInfo sqlServer() {
        return new DatabaseConnectionInfo(
                DatabaseTarget.SQLSERVER,
                env("ENLACE_SQLSERVER_HOST", "localhost"),
                intEnv("ENLACE_SQLSERVER_PORT", 14330),
                env("ENLACE_SQLSERVER_DB", "enlace_sqlserver"),
                env("ENLACE_SQLSERVER_USER", "sa"),
                env("ENLACE_SQLSERVER_PASSWORD", "Hallo1505")
        );
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value;
    }

    private static int intEnv(String name, int fallback) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return Integer.parseInt(value);
    }
}
