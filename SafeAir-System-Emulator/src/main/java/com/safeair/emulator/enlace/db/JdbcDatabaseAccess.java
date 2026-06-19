package com.safeair.emulator.enlace.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class JdbcDatabaseAccess implements AutoCloseable {

    private final DatabaseConnectionInfo info;
    private Connection connection;

    public JdbcDatabaseAccess(DatabaseConnectionInfo info) {
        this.info = info;
    }

    public boolean connect() throws SQLException {
        connection = DriverManager.getConnection(info.jdbcUrl(), info.user(), info.password());
        return true;
    }

    public Connection connection() {
        if (connection == null) {
            throw new IllegalStateException("La conexion aun no se ha abierto.");
        }
        return connection;
    }

    public int executeUpdate(String sql) throws SQLException {
        try (Statement statement = connection().createStatement()) {
            return statement.executeUpdate(sql);
        }
    }

    public List<List<Object>> query(String sql) throws SQLException {
        try (Statement statement = connection().createStatement();
                ResultSet resultSet = statement.executeQuery(sql)) {
            return toRows(resultSet);
        }
    }

    public List<List<Object>> query(String sql, Object... params) throws SQLException {
        try (PreparedStatement statement = connection().prepareStatement(sql)) {
            for (int i = 0; i < params.length; i++) {
                statement.setObject(i + 1, params[i]);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                return toRows(resultSet);
            }
        }
    }

    private List<List<Object>> toRows(ResultSet resultSet) throws SQLException {
        ResultSetMetaData metaData = resultSet.getMetaData();
        int columnCount = metaData.getColumnCount();
        List<List<Object>> rows = new ArrayList<>();
        while (resultSet.next()) {
            List<Object> row = new ArrayList<>(columnCount);
            for (int i = 1; i <= columnCount; i++) {
                row.add(resultSet.getObject(i));
            }
            rows.add(row);
        }
        return rows;
    }

    @Override
    public void close() throws SQLException {
        if (connection != null) {
            connection.close();
        }
    }
}
