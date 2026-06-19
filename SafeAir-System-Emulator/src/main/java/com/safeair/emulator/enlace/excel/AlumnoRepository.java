package com.safeair.emulator.enlace.excel;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

public class AlumnoRepository {

    private final Connection connection;

    public AlumnoRepository(Connection connection) {
        this.connection = connection;
    }

    public void upsertAlumnos(
            String table,
            String idColumn,
            int idEscuela,
            Integer idGrado,
            BigDecimal cantidad
    ) throws SQLException {
        int cantidadEntera = cantidad.setScale(0, RoundingMode.HALF_UP).intValue();
        Long existingId = findExisting(table, idColumn, idEscuela, idGrado);
        if (existingId != null) {
            update(table, idColumn, existingId, cantidadEntera);
        } else {
            insert(table, idEscuela, idGrado, cantidadEntera);
        }
    }

    private Long findExisting(String table, String idColumn, int idEscuela, Integer idGrado)
            throws SQLException {
        String sql = idGrado == null
                ? "SELECT " + idColumn + " FROM " + table + " WHERE id_escuela = ? AND id_grado IS NULL LIMIT 1"
                : "SELECT " + idColumn + " FROM " + table + " WHERE id_escuela = ? AND id_grado = ? LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, idEscuela);
            if (idGrado != null) {
                statement.setInt(2, idGrado);
            }
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getLong(1);
                }
            }
        }
        return null;
    }

    private void update(String table, String idColumn, Long existingId, int cantidad)
            throws SQLException {
        String sql = "UPDATE " + table + " SET cantidad = ? WHERE " + idColumn + " = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, cantidad);
            statement.setLong(2, existingId);
            statement.executeUpdate();
        }
    }

    private void insert(String table, int idEscuela, Integer idGrado, int cantidad)
            throws SQLException {
        String sql = "INSERT INTO " + table + " (id_escuela, id_grado, cantidad) VALUES (?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, idEscuela);
            if (idGrado == null) {
                statement.setNull(2, Types.INTEGER);
            } else {
                statement.setInt(2, idGrado);
            }
            statement.setInt(3, cantidad);
            statement.executeUpdate();
        }
    }
}
