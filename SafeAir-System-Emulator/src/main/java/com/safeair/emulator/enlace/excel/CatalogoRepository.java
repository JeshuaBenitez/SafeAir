package com.safeair.emulator.enlace.excel;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class CatalogoRepository {

    private final Connection connection;
    private final Map<String, Integer> cache = new HashMap<>();

    public CatalogoRepository(Connection connection) {
        this.connection = connection;
    }

    public void ensureBaseCatalogs() throws SQLException {
        int primaria = getOrCreateSimple("nivel_educativo", "id_nivel_educativo", "nombre_nivel", "PRIMARIA");
        int secundaria = getOrCreateSimple("nivel_educativo", "id_nivel_educativo", "nombre_nivel", "SECUNDARIA");

        for (String turno : new String[]{"MATUTINO", "VESPERTINO", "NOCTURNO", "DISCONTINUO", "COMPLETO"}) {
            getOrCreateSimple("turno", "id_turno", "nombre_turno", turno);
        }
        for (String marginacion : new String[]{"MUY BAJO", "BAJO", "MEDIO", "ALTO", "MUY ALTO"}) {
            getOrCreateSimple("grado_marginacion", "id_grado_marginacion", "nombre_grado_marginacion", marginacion);
        }
        for (String materia : new String[]{HojaConfig.ESPANOL, HojaConfig.MATEMATICAS, HojaConfig.GEOGRAFIA}) {
            getOrCreateSimple("materia", "id_materia", "nombre_materia", materia);
        }
        getOrCreateNivelLogro("INSUF", "INSUFICIENTE");
        getOrCreateNivelLogro("ELEM", "ELEMENTAL");
        getOrCreateNivelLogro("BUENO", "BUENO");
        getOrCreateNivelLogro("EXCEL", "EXCELENTE");

        for (int grado = 1; grado <= 6; grado++) {
            getOrCreateGrado(primaria, grado);
        }
        for (int grado = 1; grado <= 3; grado++) {
            getOrCreateGrado(secundaria, grado);
        }
    }

    public int getOrCreateEntidad(String claveEntidad, String nombreEntidad) throws SQLException {
        String clave = normalizar(claveEntidad);
        String nombre = normalizar(nombreEntidad);
        String cacheKey = "entidad|" + clave;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = """
                INSERT INTO entidad (clave_entidad, nombre_entidad)
                VALUES (?, ?)
                ON CONFLICT (clave_entidad)
                DO UPDATE SET nombre_entidad = EXCLUDED.nombre_entidad
                RETURNING id_entidad
                """;
        int id = executeReturningId(sql, ps -> {
            ps.setString(1, clave);
            ps.setString(2, nombre);
        });
        cache.put(cacheKey, id);
        return id;
    }

    public int getOrCreateMunicipio(int idEntidad, String claveMunicipio, String nombreMunicipio)
            throws SQLException {
        String clave = normalizar(claveMunicipio);
        String nombre = normalizar(nombreMunicipio);
        String cacheKey = "municipio|" + idEntidad + "|" + clave;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = """
                INSERT INTO municipio (id_entidad, clave_municipio, nombre_municipio)
                VALUES (?, ?, ?)
                ON CONFLICT (id_entidad, clave_municipio)
                DO UPDATE SET nombre_municipio = EXCLUDED.nombre_municipio
                RETURNING id_municipio
                """;
        int id = executeReturningId(sql, ps -> {
            ps.setInt(1, idEntidad);
            ps.setString(2, clave);
            ps.setString(3, nombre);
        });
        cache.put(cacheKey, id);
        return id;
    }

    public int getOrCreateLocalidad(int idMunicipio, String claveLocalidad, String nombreLocalidad)
            throws SQLException {
        String clave = normalizar(claveLocalidad);
        String nombre = normalizar(nombreLocalidad);
        String cacheKey = "localidad|" + idMunicipio + "|" + clave;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = """
                INSERT INTO localidad (id_municipio, clave_localidad, nombre_localidad)
                VALUES (?, ?, ?)
                ON CONFLICT (id_municipio, clave_localidad)
                DO UPDATE SET nombre_localidad = EXCLUDED.nombre_localidad
                RETURNING id_localidad
                """;
        int id = executeReturningId(sql, ps -> {
            ps.setInt(1, idMunicipio);
            ps.setString(2, clave);
            ps.setString(3, nombre);
        });
        cache.put(cacheKey, id);
        return id;
    }

    public int getOrCreateSimple(String table, String idColumn, String nameColumn, String value)
            throws SQLException {
        String clean = normalizar(value);
        String cacheKey = table + "|" + clean;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = "INSERT INTO " + table + " (" + nameColumn + ") "
                + "VALUES (?) ON CONFLICT (" + nameColumn + ") "
                + "DO UPDATE SET " + nameColumn + " = EXCLUDED." + nameColumn + " "
                + "RETURNING " + idColumn;
        int id = executeReturningId(sql, ps -> ps.setString(1, clean));
        cache.put(cacheKey, id);
        return id;
    }

    public int getOrCreateNivelLogro(String claveNivelLogro, String descripcion) throws SQLException {
        String clave = normalizar(claveNivelLogro);
        String desc = normalizar(descripcion);
        String cacheKey = "nivel_logro|" + clave;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = """
                INSERT INTO nivel_logro (clave_nivel_logro, descripcion)
                VALUES (?, ?)
                ON CONFLICT (clave_nivel_logro)
                DO UPDATE SET descripcion = EXCLUDED.descripcion
                RETURNING id_nivel_logro
                """;
        int id = executeReturningId(sql, ps -> {
            ps.setString(1, clave);
            ps.setString(2, desc);
        });
        cache.put(cacheKey, id);
        return id;
    }

    public int getOrCreateGrado(int idNivelEducativo, int numeroGrado) throws SQLException {
        String cacheKey = "grado|" + idNivelEducativo + "|" + numeroGrado;
        Integer cached = cache.get(cacheKey);
        if (cached != null) {
            return cached;
        }
        String sql = """
                INSERT INTO grado (id_nivel_educativo, numero_grado)
                VALUES (?, ?)
                ON CONFLICT (id_nivel_educativo, numero_grado)
                DO UPDATE SET numero_grado = EXCLUDED.numero_grado
                RETURNING id_grado
                """;
        int id = executeReturningId(sql, ps -> {
            ps.setInt(1, idNivelEducativo);
            ps.setInt(2, numeroGrado);
        });
        cache.put(cacheKey, id);
        return id;
    }

    private int executeReturningId(String sql, SqlSetter setter) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            setter.setValues(statement);
            try (ResultSet resultSet = statement.executeQuery()) {
                if (resultSet.next()) {
                    return resultSet.getInt(1);
                }
            }
        }
        throw new SQLException("No se pudo obtener el ID generado.");
    }

    private String normalizar(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    @FunctionalInterface
    private interface SqlSetter {
        void setValues(PreparedStatement statement) throws SQLException;
    }
}
