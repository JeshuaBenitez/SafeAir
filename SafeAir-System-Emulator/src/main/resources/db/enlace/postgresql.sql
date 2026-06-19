CREATE TABLE IF NOT EXISTS entidad (
    id_entidad SERIAL PRIMARY KEY,
    clave_entidad VARCHAR(2) NOT NULL UNIQUE,
    nombre_entidad VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS municipio (
    id_municipio SERIAL PRIMARY KEY,
    id_entidad INT NOT NULL REFERENCES entidad(id_entidad),
    clave_municipio VARCHAR(3) NOT NULL,
    nombre_municipio VARCHAR(150) NOT NULL,
    CONSTRAINT uq_municipio_entidad_clave UNIQUE (id_entidad, clave_municipio)
);

CREATE TABLE IF NOT EXISTS localidad (
    id_localidad SERIAL PRIMARY KEY,
    id_municipio INT NOT NULL REFERENCES municipio(id_municipio),
    clave_localidad VARCHAR(4) NOT NULL,
    nombre_localidad VARCHAR(150) NOT NULL,
    CONSTRAINT uq_localidad_municipio_clave UNIQUE (id_municipio, clave_localidad)
);

CREATE TABLE IF NOT EXISTS nivel_educativo (
    id_nivel_educativo SERIAL PRIMARY KEY,
    nombre_nivel VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS turno (
    id_turno SERIAL PRIMARY KEY,
    nombre_turno VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tipo_escuela (
    id_tipo_escuela SERIAL PRIMARY KEY,
    nombre_tipo_escuela VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS grado_marginacion (
    id_grado_marginacion SERIAL PRIMARY KEY,
    nombre_grado_marginacion VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS escuela (
    id_escuela SERIAL PRIMARY KEY,
    clave_escuela VARCHAR(30) NOT NULL,
    nombre_escuela VARCHAR(200) NOT NULL,
    id_localidad INT NOT NULL REFERENCES localidad(id_localidad),
    id_nivel_educativo INT NOT NULL REFERENCES nivel_educativo(id_nivel_educativo),
    id_turno INT NOT NULL REFERENCES turno(id_turno),
    id_tipo_escuela INT NOT NULL REFERENCES tipo_escuela(id_tipo_escuela),
    id_grado_marginacion INT NOT NULL REFERENCES grado_marginacion(id_grado_marginacion),
    CONSTRAINT uq_escuela_clave_turno_nivel UNIQUE (clave_escuela, id_turno, id_nivel_educativo)
);

CREATE TABLE IF NOT EXISTS grado (
    id_grado SERIAL PRIMARY KEY,
    id_nivel_educativo INT NOT NULL REFERENCES nivel_educativo(id_nivel_educativo),
    numero_grado SMALLINT NOT NULL CHECK (numero_grado > 0),
    CONSTRAINT uq_grado_nivel_numero UNIQUE (id_nivel_educativo, numero_grado)
);

CREATE TABLE IF NOT EXISTS materia (
    id_materia SERIAL PRIMARY KEY,
    nombre_materia VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS nivel_logro (
    id_nivel_logro SERIAL PRIMARY KEY,
    clave_nivel_logro VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS resultado_promedio (
    id_resultado_promedio BIGSERIAL PRIMARY KEY,
    id_escuela INT NOT NULL REFERENCES escuela(id_escuela),
    id_grado INT NOT NULL REFERENCES grado(id_grado),
    id_materia INT NOT NULL REFERENCES materia(id_materia),
    puntaje_promedio NUMERIC(7,2),
    CONSTRAINT uq_resultado_promedio UNIQUE (id_escuela, id_grado, id_materia),
    CONSTRAINT chk_puntaje_promedio CHECK (puntaje_promedio IS NULL OR puntaje_promedio >= 0)
);

CREATE TABLE IF NOT EXISTS resultado_logro (
    id_resultado_logro BIGSERIAL PRIMARY KEY,
    id_escuela INT NOT NULL REFERENCES escuela(id_escuela),
    id_grado INT NOT NULL REFERENCES grado(id_grado),
    id_materia INT NOT NULL REFERENCES materia(id_materia),
    id_nivel_logro INT NOT NULL REFERENCES nivel_logro(id_nivel_logro),
    porcentaje NUMERIC(5,2) NOT NULL,
    CONSTRAINT uq_resultado_logro UNIQUE (id_escuela, id_grado, id_materia, id_nivel_logro),
    CONSTRAINT chk_resultado_logro_porcentaje CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

CREATE TABLE IF NOT EXISTS alumnos_evaluados (
    id_alumnos_evaluados BIGSERIAL PRIMARY KEY,
    id_escuela INT NOT NULL REFERENCES escuela(id_escuela),
    id_grado INT REFERENCES grado(id_grado),
    cantidad INT NOT NULL CHECK (cantidad >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumnos_evaluados_grado
    ON alumnos_evaluados (id_escuela, id_grado)
    WHERE id_grado IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumnos_evaluados_total
    ON alumnos_evaluados (id_escuela)
    WHERE id_grado IS NULL;

CREATE TABLE IF NOT EXISTS alumnos_resultado_poco_confiable (
    id_alumnos_poco_confiable BIGSERIAL PRIMARY KEY,
    id_escuela INT NOT NULL REFERENCES escuela(id_escuela),
    id_grado INT REFERENCES grado(id_grado),
    cantidad INT NOT NULL CHECK (cantidad >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumnos_poco_confiable_grado
    ON alumnos_resultado_poco_confiable (id_escuela, id_grado)
    WHERE id_grado IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_alumnos_poco_confiable_total
    ON alumnos_resultado_poco_confiable (id_escuela)
    WHERE id_grado IS NULL;

CREATE TABLE IF NOT EXISTS validacion_error (
    id_validacion_error BIGSERIAL PRIMARY KEY,
    nombre_validacion VARCHAR(100) NOT NULL,
    tabla_origen VARCHAR(100) NOT NULL,
    id_referencia BIGINT,
    detalle TEXT NOT NULL,
    fecha_validacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO entidad (clave_entidad, nombre_entidad)
VALUES ('30', 'VERACRUZ')
ON CONFLICT (clave_entidad) DO UPDATE SET nombre_entidad = EXCLUDED.nombre_entidad;

INSERT INTO nivel_educativo (nombre_nivel)
VALUES ('PRIMARIA'), ('SECUNDARIA')
ON CONFLICT (nombre_nivel) DO NOTHING;

INSERT INTO turno (nombre_turno)
VALUES ('MATUTINO'), ('VESPERTINO'), ('NOCTURNO'), ('DISCONTINUO'), ('COMPLETO')
ON CONFLICT (nombre_turno) DO NOTHING;

INSERT INTO grado_marginacion (nombre_grado_marginacion)
VALUES ('MUY BAJO'), ('BAJO'), ('MEDIO'), ('ALTO'), ('MUY ALTO')
ON CONFLICT (nombre_grado_marginacion) DO NOTHING;

INSERT INTO materia (nombre_materia)
VALUES ('ESPAÑOL'), ('MATEMÁTICAS'), ('GEOGRAFÍA')
ON CONFLICT (nombre_materia) DO NOTHING;

INSERT INTO nivel_logro (clave_nivel_logro, descripcion)
VALUES
    ('INSUF', 'INSUFICIENTE'),
    ('ELEM', 'ELEMENTAL'),
    ('BUENO', 'BUENO'),
    ('EXCEL', 'EXCELENTE')
ON CONFLICT (clave_nivel_logro) DO UPDATE SET descripcion = EXCLUDED.descripcion;

INSERT INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, g
FROM nivel_educativo CROSS JOIN generate_series(1, 6) AS g
WHERE nombre_nivel = 'PRIMARIA'
ON CONFLICT (id_nivel_educativo, numero_grado) DO NOTHING;

INSERT INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, g
FROM nivel_educativo CROSS JOIN generate_series(1, 3) AS g
WHERE nombre_nivel = 'SECUNDARIA'
ON CONFLICT (id_nivel_educativo, numero_grado) DO NOTHING;

CREATE OR REPLACE PROCEDURE limpiar_errores_validacion()
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM validacion_error;
END;
$$;

CREATE OR REPLACE PROCEDURE validar_clave_escuela()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_clave_escuela',
        'escuela',
        e.id_escuela,
        'Clave de escuela invalida: ' || COALESCE(e.clave_escuela, 'NULL')
    FROM escuela e
    WHERE e.clave_escuela IS NULL
       OR btrim(e.clave_escuela) !~ '^30[A-Z]{3}[0-9]{4}[A-Z]$';
END;
$$;

CREATE OR REPLACE PROCEDURE validar_grado_marginacion()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_grado_marginacion',
        'grado_marginacion',
        gm.id_grado_marginacion,
        'Grado de marginacion invalido: ' || COALESCE(gm.nombre_grado_marginacion, 'NULL')
    FROM grado_marginacion gm
    WHERE gm.nombre_grado_marginacion IS NULL
       OR upper(btrim(gm.nombre_grado_marginacion)) NOT IN ('MUY BAJO', 'BAJO', 'MEDIO', 'ALTO', 'MUY ALTO');
END;
$$;

CREATE OR REPLACE PROCEDURE validar_alumnos_evaluados()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_alumnos_evaluados',
        'alumnos_evaluados',
        ae_total.id_escuela,
        'No coincide el total de alumnos evaluados. Total escuela = '
            || ae_total.cantidad || ', suma por grado = ' || COALESCE(SUM(ae_grado.cantidad), 0)
    FROM alumnos_evaluados ae_total
    LEFT JOIN alumnos_evaluados ae_grado
        ON ae_total.id_escuela = ae_grado.id_escuela
       AND ae_grado.id_grado IS NOT NULL
    WHERE ae_total.id_grado IS NULL
    GROUP BY ae_total.id_escuela, ae_total.cantidad
    HAVING ae_total.cantidad <> COALESCE(SUM(ae_grado.cantidad), 0);
END;
$$;

CREATE OR REPLACE PROCEDURE validar_porcentaje_nivel_logro()
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_porcentaje_nivel_logro',
        'resultado_logro',
        rl.id_escuela,
        'La suma de porcentajes no es 100. Escuela=' || rl.id_escuela
            || ', grado=' || rl.id_grado || ', materia=' || rl.id_materia
            || ', suma=' || SUM(rl.porcentaje)
    FROM resultado_logro rl
    INNER JOIN nivel_logro nl ON rl.id_nivel_logro = nl.id_nivel_logro
    WHERE nl.clave_nivel_logro IN ('INSUF', 'ELEM', 'BUENO', 'EXCEL')
    GROUP BY rl.id_escuela, rl.id_grado, rl.id_materia
    HAVING SUM(rl.porcentaje) < 99.99 OR SUM(rl.porcentaje) > 100.01;
END;
$$;

CREATE OR REPLACE PROCEDURE validar_base_enlace()
LANGUAGE plpgsql
AS $$
BEGIN
    CALL limpiar_errores_validacion();
    CALL validar_clave_escuela();
    CALL validar_grado_marginacion();
    CALL validar_alumnos_evaluados();
    CALL validar_porcentaje_nivel_logro();
END;
$$;
