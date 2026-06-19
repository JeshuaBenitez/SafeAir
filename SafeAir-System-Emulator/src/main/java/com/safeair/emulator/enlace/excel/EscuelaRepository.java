package com.safeair.emulator.enlace.excel;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

public class EscuelaRepository {

    private final Connection connection;
    private final Map<String, Integer> cache = new HashMap<>();

    public EscuelaRepository(Connection connection) {
        this.connection = connection;
    }

    public int getOrCreateEscuela(
            String claveEscuela,
            String nombreEscuela,
            int idLocalidad,
            int idNivelEducativo,
            int idTurno,
            int idTipoEscuela,
            int idGradoMarginacion
    ) throws SQLException {
        String cacheKey = "escuela|" + claveEscuela + "|" + idTurno + "|" + idNivelEducativo;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        String sql = """
                INSERT INTO escuela (
                    clave_escuela, nombre_escuela, id_localidad, id_nivel_educativo,
                    id_turno, id_tipo_escuela, id_grado_marginacion
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (clave_escuela, id_turno, id_nivel_educativo)
                DO UPDATE SET
                    nombre_escuela = EXCLUDED.nombre_escuela,
                    id_localidad = EXCLUDED.id_localidad,
                    id_tipo_escuela = EXCLUDED.id_tipo_escuela,
                    id_grado_marginacion = EXCLUDED.id_grado_marginacion
                RETURNING id_escuela
                """;

        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, claveEscuela);
            statement.setString(2, nombreEscuela);
            statement.setInt(3, idLocalidad);
            statement.setInt(4, idNivelEducativo);
            statement.setInt(5, idTurno);
            statement.setInt(6, idTipoEscuela);
            statement.setInt(7, idGradoMarginacion);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    int id = resultSet.getInt(1);
                    cache.put(cacheKey, id);
                    return id;
                }
            }
        }
        throw new SQLException("No se pudo obtener id_escuela.");
    }
}
