package com.safeair.emulator.enlace.db;

public class SqlServerAccess extends JdbcDatabaseAccess {

    public SqlServerAccess() {
        super(EnlaceDatabaseConfig.sqlServer());
    }
}
