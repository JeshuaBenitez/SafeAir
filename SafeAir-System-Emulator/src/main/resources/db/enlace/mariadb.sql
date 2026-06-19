CREATE TABLE IF NOT EXISTS entidad (
    id_entidad INT AUTO_INCREMENT PRIMARY KEY,
    clave_entidad VARCHAR(2) NOT NULL UNIQUE,
    nombre_entidad VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS municipio (
    id_municipio INT AUTO_INCREMENT PRIMARY KEY,
    id_entidad INT NOT NULL,
    clave_municipio VARCHAR(3) NOT NULL,
    nombre_municipio VARCHAR(150) NOT NULL,
    CONSTRAINT fk_municipio_entidad FOREIGN KEY (id_entidad) REFERENCES entidad(id_entidad),
    CONSTRAINT uq_municipio_entidad_clave UNIQUE (id_entidad, clave_municipio)
);

CREATE TABLE IF NOT EXISTS localidad (
    id_localidad INT AUTO_INCREMENT PRIMARY KEY,
    id_municipio INT NOT NULL,
    clave_localidad VARCHAR(4) NOT NULL,
    nombre_localidad VARCHAR(150) NOT NULL,
    CONSTRAINT fk_localidad_municipio FOREIGN KEY (id_municipio) REFERENCES municipio(id_municipio),
    CONSTRAINT uq_localidad_municipio_clave UNIQUE (id_municipio, clave_localidad)
);

CREATE TABLE IF NOT EXISTS nivel_educativo (
    id_nivel_educativo INT AUTO_INCREMENT PRIMARY KEY,
    nombre_nivel VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS turno (
    id_turno INT AUTO_INCREMENT PRIMARY KEY,
    nombre_turno VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tipo_escuela (
    id_tipo_escuela INT AUTO_INCREMENT PRIMARY KEY,
    nombre_tipo_escuela VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS grado_marginacion (
    id_grado_marginacion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_grado_marginacion VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS escuela (
    id_escuela INT AUTO_INCREMENT PRIMARY KEY,
    clave_escuela VARCHAR(30) NOT NULL,
    nombre_escuela VARCHAR(200) NOT NULL,
    id_localidad INT NOT NULL,
    id_nivel_educativo INT NOT NULL,
    id_turno INT NOT NULL,
    id_tipo_escuela INT NOT NULL,
    id_grado_marginacion INT NOT NULL,
    CONSTRAINT fk_escuela_localidad FOREIGN KEY (id_localidad) REFERENCES localidad(id_localidad),
    CONSTRAINT fk_escuela_nivel_educativo FOREIGN KEY (id_nivel_educativo) REFERENCES nivel_educativo(id_nivel_educativo),
    CONSTRAINT fk_escuela_turno FOREIGN KEY (id_turno) REFERENCES turno(id_turno),
    CONSTRAINT fk_escuela_tipo_escuela FOREIGN KEY (id_tipo_escuela) REFERENCES tipo_escuela(id_tipo_escuela),
    CONSTRAINT fk_escuela_grado_marginacion FOREIGN KEY (id_grado_marginacion) REFERENCES grado_marginacion(id_grado_marginacion),
    CONSTRAINT uq_escuela_clave_turno_nivel UNIQUE (clave_escuela, id_turno, id_nivel_educativo)
);

CREATE TABLE IF NOT EXISTS grado (
    id_grado INT AUTO_INCREMENT PRIMARY KEY,
    id_nivel_educativo INT NOT NULL,
    numero_grado SMALLINT NOT NULL,
    CONSTRAINT fk_grado_nivel_educativo FOREIGN KEY (id_nivel_educativo) REFERENCES nivel_educativo(id_nivel_educativo),
    CONSTRAINT uq_grado_nivel_numero UNIQUE (id_nivel_educativo, numero_grado),
    CONSTRAINT chk_grado_numero CHECK (numero_grado > 0)
);

CREATE TABLE IF NOT EXISTS materia (
    id_materia INT AUTO_INCREMENT PRIMARY KEY,
    nombre_materia VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS nivel_logro (
    id_nivel_logro INT AUTO_INCREMENT PRIMARY KEY,
    clave_nivel_logro VARCHAR(20) NOT NULL UNIQUE,
    descripcion VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS resultado_promedio (
    id_resultado_promedio BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_escuela INT NOT NULL,
    id_grado INT NOT NULL,
    id_materia INT NOT NULL,
    puntaje_promedio DECIMAL(7,2),
    CONSTRAINT fk_resultado_promedio_escuela FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    CONSTRAINT fk_resultado_promedio_grado FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    CONSTRAINT fk_resultado_promedio_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia),
    CONSTRAINT uq_resultado_promedio UNIQUE (id_escuela, id_grado, id_materia),
    CONSTRAINT chk_puntaje_promedio CHECK (puntaje_promedio IS NULL OR puntaje_promedio >= 0)
);

CREATE TABLE IF NOT EXISTS resultado_logro (
    id_resultado_logro BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_escuela INT NOT NULL,
    id_grado INT NOT NULL,
    id_materia INT NOT NULL,
    id_nivel_logro INT NOT NULL,
    porcentaje DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_resultado_logro_escuela FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    CONSTRAINT fk_resultado_logro_grado FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    CONSTRAINT fk_resultado_logro_materia FOREIGN KEY (id_materia) REFERENCES materia(id_materia),
    CONSTRAINT fk_resultado_logro_nivel FOREIGN KEY (id_nivel_logro) REFERENCES nivel_logro(id_nivel_logro),
    CONSTRAINT uq_resultado_logro UNIQUE (id_escuela, id_grado, id_materia, id_nivel_logro),
    CONSTRAINT chk_resultado_logro_porcentaje CHECK (porcentaje >= 0 AND porcentaje <= 100)
);

CREATE TABLE IF NOT EXISTS alumnos_evaluados (
    id_alumnos_evaluados BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_escuela INT NOT NULL,
    id_grado INT NULL,
    cantidad INT NOT NULL,
    CONSTRAINT fk_alumnos_evaluados_escuela FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    CONSTRAINT fk_alumnos_evaluados_grado FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    CONSTRAINT chk_alumnos_evaluados_cantidad CHECK (cantidad >= 0),
    CONSTRAINT uq_alumnos_evaluados_registro UNIQUE (id_escuela, id_grado)
);

CREATE TABLE IF NOT EXISTS alumnos_resultado_poco_confiable (
    id_alumnos_poco_confiable BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_escuela INT NOT NULL,
    id_grado INT NULL,
    cantidad INT NOT NULL,
    CONSTRAINT fk_alumnos_poco_escuela FOREIGN KEY (id_escuela) REFERENCES escuela(id_escuela),
    CONSTRAINT fk_alumnos_poco_grado FOREIGN KEY (id_grado) REFERENCES grado(id_grado),
    CONSTRAINT chk_alumnos_poco_cantidad CHECK (cantidad >= 0),
    CONSTRAINT uq_alumnos_poco_registro UNIQUE (id_escuela, id_grado)
);

CREATE TABLE IF NOT EXISTS validacion_error (
    id_validacion_error BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre_validacion VARCHAR(100) NOT NULL,
    tabla_origen VARCHAR(100) NOT NULL,
    id_referencia BIGINT,
    detalle TEXT NOT NULL,
    fecha_validacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO entidad (clave_entidad, nombre_entidad) VALUES ('30', 'VERACRUZ');
INSERT IGNORE INTO nivel_educativo (nombre_nivel) VALUES ('PRIMARIA'), ('SECUNDARIA');
INSERT IGNORE INTO turno (nombre_turno) VALUES ('MATUTINO'), ('VESPERTINO'), ('NOCTURNO'), ('DISCONTINUO'), ('COMPLETO');
INSERT IGNORE INTO grado_marginacion (nombre_grado_marginacion) VALUES ('MUY BAJO'), ('BAJO'), ('MEDIO'), ('ALTO'), ('MUY ALTO');
INSERT IGNORE INTO materia (nombre_materia) VALUES ('ESPAÑOL'), ('MATEMÁTICAS'), ('GEOGRAFÍA');
INSERT IGNORE INTO nivel_logro (clave_nivel_logro, descripcion)
VALUES ('INSUF', 'INSUFICIENTE'), ('ELEM', 'ELEMENTAL'), ('BUENO', 'BUENO'), ('EXCEL', 'EXCELENTE');

INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 1 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 2 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 3 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 4 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 5 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 6 FROM nivel_educativo WHERE nombre_nivel = 'PRIMARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 1 FROM nivel_educativo WHERE nombre_nivel = 'SECUNDARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 2 FROM nivel_educativo WHERE nombre_nivel = 'SECUNDARIA';
INSERT IGNORE INTO grado (id_nivel_educativo, numero_grado)
SELECT id_nivel_educativo, 3 FROM nivel_educativo WHERE nombre_nivel = 'SECUNDARIA';

DROP PROCEDURE IF EXISTS limpiar_errores_validacion;
DROP PROCEDURE IF EXISTS validar_clave_escuela;
DROP PROCEDURE IF EXISTS validar_grado_marginacion;
DROP PROCEDURE IF EXISTS validar_alumnos_evaluados;
DROP PROCEDURE IF EXISTS validar_porcentaje_nivel_logro;
DROP PROCEDURE IF EXISTS validar_base_enlace;

DELIMITER //
CREATE PROCEDURE limpiar_errores_validacion()
BEGIN
    DELETE FROM validacion_error;
END//

CREATE PROCEDURE validar_clave_escuela()
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_clave_escuela',
        'escuela',
        e.id_escuela,
        CONCAT('Clave de escuela invalida: ', COALESCE(e.clave_escuela, 'NULL'))
    FROM escuela e
    WHERE e.clave_escuela IS NULL
       OR TRIM(e.clave_escuela) NOT REGEXP '^30[A-Z]{3}[0-9]{4}[A-Z]$';
END//

CREATE PROCEDURE validar_grado_marginacion()
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_grado_marginacion',
        'grado_marginacion',
        gm.id_grado_marginacion,
        CONCAT('Grado de marginacion invalido: ', COALESCE(gm.nombre_grado_marginacion, 'NULL'))
    FROM grado_marginacion gm
    WHERE gm.nombre_grado_marginacion IS NULL
       OR UPPER(TRIM(gm.nombre_grado_marginacion)) NOT IN ('MUY BAJO', 'BAJO', 'MEDIO', 'ALTO', 'MUY ALTO');
END//

CREATE PROCEDURE validar_alumnos_evaluados()
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_alumnos_evaluados',
        'alumnos_evaluados',
        ae_total.id_escuela,
        CONCAT(
            'No coincide el total de alumnos evaluados. Total escuela = ',
            ae_total.cantidad,
            ', suma por grado = ',
            COALESCE(SUM(ae_grado.cantidad), 0)
        )
    FROM alumnos_evaluados ae_total
    LEFT JOIN alumnos_evaluados ae_grado
        ON ae_total.id_escuela = ae_grado.id_escuela
       AND ae_grado.id_grado IS NOT NULL
    WHERE ae_total.id_grado IS NULL
    GROUP BY ae_total.id_escuela, ae_total.cantidad
    HAVING ae_total.cantidad <> COALESCE(SUM(ae_grado.cantidad), 0);
END//

CREATE PROCEDURE validar_porcentaje_nivel_logro()
BEGIN
    INSERT INTO validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_porcentaje_nivel_logro',
        'resultado_logro',
        rl.id_escuela,
        CONCAT(
            'La suma de porcentajes no es 100. Escuela=',
            rl.id_escuela,
            ', grado=',
            rl.id_grado,
            ', materia=',
            rl.id_materia,
            ', suma=',
            SUM(rl.porcentaje)
        )
    FROM resultado_logro rl
    INNER JOIN nivel_logro nl ON rl.id_nivel_logro = nl.id_nivel_logro
    WHERE nl.clave_nivel_logro IN ('INSUF', 'ELEM', 'BUENO', 'EXCEL')
    GROUP BY rl.id_escuela, rl.id_grado, rl.id_materia
    HAVING SUM(rl.porcentaje) < 99.99 OR SUM(rl.porcentaje) > 100.01;
END//

CREATE PROCEDURE validar_base_enlace()
BEGIN
    CALL limpiar_errores_validacion();
    CALL validar_clave_escuela();
    CALL validar_grado_marginacion();
    CALL validar_alumnos_evaluados();
    CALL validar_porcentaje_nivel_logro();
END//
DELIMITER ;
