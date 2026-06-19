package com.safeair.emulator.enlace.db;

public class PostgreSqlAccess extends JdbcDatabaseAccess {

    public PostgreSqlAccess() {
        super(EnlaceDatabaseConfig.postgresql());
    }
}
