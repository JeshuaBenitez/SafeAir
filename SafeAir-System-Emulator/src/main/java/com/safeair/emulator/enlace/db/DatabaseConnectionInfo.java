package com.safeair.emulator.enlace.db;

public record DatabaseConnectionInfo(
        DatabaseTarget target,
        String host,
        int port,
        String database,
        String user,
        String password
) {
    public String jdbcUrl() {
        return switch (target) {
            case POSTGRESQL -> "jdbc:postgresql://" + host + ":" + port + "/" + database;
            case MARIADB -> "jdbc:mariadb://" + host + ":" + port + "/" + database;
            case SQLSERVER -> "jdbc:sqlserver://" + host + ":" + port
                    + ";databaseName=" + database
                    + ";encrypt=true;trustServerCertificate=true";
        };
    }

    public String adminJdbcUrl() {
        return switch (target) {
            case POSTGRESQL -> "jdbc:postgresql://" + host + ":" + port + "/postgres";
            case MARIADB -> "jdbc:mariadb://" + host + ":" + port + "/";
            case SQLSERVER -> "jdbc:sqlserver://" + host + ":" + port
                    + ";databaseName=master;encrypt=true;trustServerCertificate=true";
        };
    }
}
