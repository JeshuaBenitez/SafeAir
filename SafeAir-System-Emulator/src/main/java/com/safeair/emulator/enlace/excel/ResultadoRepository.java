package com.safeair.emulator.enlace.excel;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ResultadoRepository {

    private final Connection connection;

    public ResultadoRepository(Connection connection) {
        this.connection = connection;
    }

    public void upsertResultadoPromedio(int idEscuela, int idGrado, int idMateria, BigDecimal puntaje)
            throws SQLException {
        String sql = """
                INSERT INTO resultado_promedio (id_escuela, id_grado, id_materia, puntaje_promedio)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (id_escuela, id_grado, id_materia)
                DO UPDATE SET puntaje_promedio = EXCLUDED.puntaje_promedio
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, idEscuela);
            statement.setInt(2, idGrado);
            statement.setInt(3, idMateria);
            statement.setBigDecimal(4, puntaje);
            statement.executeUpdate();
        }
    }

    public void upsertResultadoLogro(
            int idEscuela,
            int idGrado,
            int idMateria,
            int idNivelLogro,
            BigDecimal porcentaje
    ) throws SQLException {
        String sql = """
                INSERT INTO resultado_logro (
                    id_escuela, id_grado, id_materia, id_nivel_logro, porcentaje
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (id_escuela, id_grado, id_materia, id_nivel_logro)
                DO UPDATE SET porcentaje = EXCLUDED.porcentaje
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, idEscuela);
            statement.setInt(2, idGrado);
            statement.setInt(3, idMateria);
            statement.setInt(4, idNivelLogro);
            statement.setBigDecimal(5, porcentaje);
            statement.executeUpdate();
        }
    }
}
