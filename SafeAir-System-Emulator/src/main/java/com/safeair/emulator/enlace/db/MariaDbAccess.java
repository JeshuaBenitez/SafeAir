package com.safeair.emulator.enlace.db;

public class MariaDbAccess extends JdbcDatabaseAccess {

    public MariaDbAccess() {
        super(EnlaceDatabaseConfig.mariadb());
    }
}
