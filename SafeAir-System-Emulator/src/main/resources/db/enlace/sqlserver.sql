IF DB_ID(N'enlace_sqlserver') IS NULL
BEGIN
    CREATE DATABASE enlace_sqlserver;
END
GO

USE enlace_sqlserver;
GO

IF OBJECT_ID('dbo.entidad', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.entidad (
        id_entidad INT IDENTITY(1,1) PRIMARY KEY,
        clave_entidad VARCHAR(2) NOT NULL UNIQUE,
        nombre_entidad VARCHAR(100) NOT NULL
    );
END
GO

IF OBJECT_ID('dbo.municipio', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.municipio (
        id_municipio INT IDENTITY(1,1) PRIMARY KEY,
        id_entidad INT NOT NULL,
        clave_municipio VARCHAR(3) NOT NULL,
        nombre_municipio VARCHAR(150) NOT NULL,
        CONSTRAINT fk_municipio_entidad FOREIGN KEY (id_entidad) REFERENCES dbo.entidad(id_entidad),
        CONSTRAINT uq_municipio_entidad_clave UNIQUE (id_entidad, clave_municipio)
    );
END
GO

IF OBJECT_ID('dbo.localidad', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.localidad (
        id_localidad INT IDENTITY(1,1) PRIMARY KEY,
        id_municipio INT NOT NULL,
        clave_localidad VARCHAR(4) NOT NULL,
        nombre_localidad VARCHAR(150) NOT NULL,
        CONSTRAINT fk_localidad_municipio FOREIGN KEY (id_municipio) REFERENCES dbo.municipio(id_municipio),
        CONSTRAINT uq_localidad_municipio_clave UNIQUE (id_municipio, clave_localidad)
    );
END
GO

IF OBJECT_ID('dbo.nivel_educativo', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.nivel_educativo (
        id_nivel_educativo INT IDENTITY(1,1) PRIMARY KEY,
        nombre_nivel VARCHAR(30) NOT NULL UNIQUE
    );
END
GO

IF OBJECT_ID('dbo.turno', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.turno (
        id_turno INT IDENTITY(1,1) PRIMARY KEY,
        nombre_turno VARCHAR(50) NOT NULL UNIQUE
    );
END
GO

IF OBJECT_ID('dbo.tipo_escuela', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tipo_escuela (
        id_tipo_escuela INT IDENTITY(1,1) PRIMARY KEY,
        nombre_tipo_escuela VARCHAR(100) NOT NULL UNIQUE
    );
END
GO

IF OBJECT_ID('dbo.grado_marginacion', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.grado_marginacion (
        id_grado_marginacion INT IDENTITY(1,1) PRIMARY KEY,
        nombre_grado_marginacion VARCHAR(50) NOT NULL UNIQUE
    );
END
GO

IF OBJECT_ID('dbo.escuela', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.escuela (
        id_escuela INT IDENTITY(1,1) PRIMARY KEY,
        clave_escuela VARCHAR(30) NOT NULL,
        nombre_escuela VARCHAR(200) NOT NULL,
        id_localidad INT NOT NULL,
        id_nivel_educativo INT NOT NULL,
        id_turno INT NOT NULL,
        id_tipo_escuela INT NOT NULL,
        id_grado_marginacion INT NOT NULL,
        CONSTRAINT fk_escuela_localidad FOREIGN KEY (id_localidad) REFERENCES dbo.localidad(id_localidad),
        CONSTRAINT fk_escuela_nivel_educativo FOREIGN KEY (id_nivel_educativo) REFERENCES dbo.nivel_educativo(id_nivel_educativo),
        CONSTRAINT fk_escuela_turno FOREIGN KEY (id_turno) REFERENCES dbo.turno(id_turno),
        CONSTRAINT fk_escuela_tipo_escuela FOREIGN KEY (id_tipo_escuela) REFERENCES dbo.tipo_escuela(id_tipo_escuela),
        CONSTRAINT fk_escuela_grado_marginacion FOREIGN KEY (id_grado_marginacion) REFERENCES dbo.grado_marginacion(id_grado_marginacion),
        CONSTRAINT uq_escuela_clave_turno_nivel UNIQUE (clave_escuela, id_turno, id_nivel_educativo)
    );
END
GO

IF OBJECT_ID('dbo.grado', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.grado (
        id_grado INT IDENTITY(1,1) PRIMARY KEY,
        id_nivel_educativo INT NOT NULL,
        numero_grado SMALLINT NOT NULL,
        CONSTRAINT fk_grado_nivel_educativo FOREIGN KEY (id_nivel_educativo) REFERENCES dbo.nivel_educativo(id_nivel_educativo),
        CONSTRAINT uq_grado_nivel_numero UNIQUE (id_nivel_educativo, numero_grado),
        CONSTRAINT chk_grado_numero CHECK (numero_grado > 0)
    );
END
GO

IF OBJECT_ID('dbo.materia', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.materia (
        id_materia INT IDENTITY(1,1) PRIMARY KEY,
        nombre_materia VARCHAR(80) NOT NULL UNIQUE
    );
END
GO

IF OBJECT_ID('dbo.nivel_logro', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.nivel_logro (
        id_nivel_logro INT IDENTITY(1,1) PRIMARY KEY,
        clave_nivel_logro VARCHAR(20) NOT NULL UNIQUE,
        descripcion VARCHAR(80) NOT NULL
    );
END
GO

IF OBJECT_ID('dbo.resultado_promedio', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.resultado_promedio (
        id_resultado_promedio BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_escuela INT NOT NULL,
        id_grado INT NOT NULL,
        id_materia INT NOT NULL,
        puntaje_promedio DECIMAL(7,2),
        CONSTRAINT fk_resultado_promedio_escuela FOREIGN KEY (id_escuela) REFERENCES dbo.escuela(id_escuela),
        CONSTRAINT fk_resultado_promedio_grado FOREIGN KEY (id_grado) REFERENCES dbo.grado(id_grado),
        CONSTRAINT fk_resultado_promedio_materia FOREIGN KEY (id_materia) REFERENCES dbo.materia(id_materia),
        CONSTRAINT uq_resultado_promedio UNIQUE (id_escuela, id_grado, id_materia),
        CONSTRAINT chk_puntaje_promedio CHECK (puntaje_promedio IS NULL OR puntaje_promedio >= 0)
    );
END
GO

IF OBJECT_ID('dbo.resultado_logro', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.resultado_logro (
        id_resultado_logro BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_escuela INT NOT NULL,
        id_grado INT NOT NULL,
        id_materia INT NOT NULL,
        id_nivel_logro INT NOT NULL,
        porcentaje DECIMAL(5,2) NOT NULL,
        CONSTRAINT fk_resultado_logro_escuela FOREIGN KEY (id_escuela) REFERENCES dbo.escuela(id_escuela),
        CONSTRAINT fk_resultado_logro_grado FOREIGN KEY (id_grado) REFERENCES dbo.grado(id_grado),
        CONSTRAINT fk_resultado_logro_materia FOREIGN KEY (id_materia) REFERENCES dbo.materia(id_materia),
        CONSTRAINT fk_resultado_logro_nivel FOREIGN KEY (id_nivel_logro) REFERENCES dbo.nivel_logro(id_nivel_logro),
        CONSTRAINT uq_resultado_logro UNIQUE (id_escuela, id_grado, id_materia, id_nivel_logro),
        CONSTRAINT chk_resultado_logro_porcentaje CHECK (porcentaje >= 0 AND porcentaje <= 100)
    );
END
GO

IF OBJECT_ID('dbo.alumnos_evaluados', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.alumnos_evaluados (
        id_alumnos_evaluados BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_escuela INT NOT NULL,
        id_grado INT NULL,
        cantidad INT NOT NULL,
        CONSTRAINT fk_alumnos_evaluados_escuela FOREIGN KEY (id_escuela) REFERENCES dbo.escuela(id_escuela),
        CONSTRAINT fk_alumnos_evaluados_grado FOREIGN KEY (id_grado) REFERENCES dbo.grado(id_grado),
        CONSTRAINT chk_alumnos_evaluados_cantidad CHECK (cantidad >= 0)
    );
END
GO

IF OBJECT_ID('dbo.alumnos_resultado_poco_confiable', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.alumnos_resultado_poco_confiable (
        id_alumnos_poco_confiable BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_escuela INT NOT NULL,
        id_grado INT NULL,
        cantidad INT NOT NULL,
        CONSTRAINT fk_alumnos_poco_escuela FOREIGN KEY (id_escuela) REFERENCES dbo.escuela(id_escuela),
        CONSTRAINT fk_alumnos_poco_grado FOREIGN KEY (id_grado) REFERENCES dbo.grado(id_grado),
        CONSTRAINT chk_alumnos_poco_cantidad CHECK (cantidad >= 0)
    );
END
GO

IF OBJECT_ID('dbo.validacion_error', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.validacion_error (
        id_validacion_error BIGINT IDENTITY(1,1) PRIMARY KEY,
        nombre_validacion VARCHAR(100) NOT NULL,
        tabla_origen VARCHAR(100) NOT NULL,
        id_referencia BIGINT,
        detalle NVARCHAR(MAX) NOT NULL,
        fecha_validacion DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.entidad WHERE clave_entidad = '30')
    INSERT INTO dbo.entidad (clave_entidad, nombre_entidad) VALUES ('30', 'VERACRUZ');
GO

MERGE dbo.nivel_educativo AS t
USING (VALUES ('PRIMARIA'), ('SECUNDARIA')) AS s(nombre_nivel)
ON t.nombre_nivel = s.nombre_nivel
WHEN NOT MATCHED THEN INSERT (nombre_nivel) VALUES (s.nombre_nivel);
GO

MERGE dbo.turno AS t
USING (VALUES ('MATUTINO'), ('VESPERTINO'), ('NOCTURNO'), ('DISCONTINUO'), ('COMPLETO')) AS s(nombre_turno)
ON t.nombre_turno = s.nombre_turno
WHEN NOT MATCHED THEN INSERT (nombre_turno) VALUES (s.nombre_turno);
GO

MERGE dbo.grado_marginacion AS t
USING (VALUES ('MUY BAJO'), ('BAJO'), ('MEDIO'), ('ALTO'), ('MUY ALTO')) AS s(nombre_grado_marginacion)
ON t.nombre_grado_marginacion = s.nombre_grado_marginacion
WHEN NOT MATCHED THEN INSERT (nombre_grado_marginacion) VALUES (s.nombre_grado_marginacion);
GO

MERGE dbo.materia AS t
USING (VALUES ('ESPAÑOL'), ('MATEMÁTICAS'), ('GEOGRAFÍA')) AS s(nombre_materia)
ON t.nombre_materia = s.nombre_materia
WHEN NOT MATCHED THEN INSERT (nombre_materia) VALUES (s.nombre_materia);
GO

MERGE dbo.nivel_logro AS t
USING (VALUES
    ('INSUF', 'INSUFICIENTE'),
    ('ELEM', 'ELEMENTAL'),
    ('BUENO', 'BUENO'),
    ('EXCEL', 'EXCELENTE')
) AS s(clave_nivel_logro, descripcion)
ON t.clave_nivel_logro = s.clave_nivel_logro
WHEN MATCHED THEN UPDATE SET descripcion = s.descripcion
WHEN NOT MATCHED THEN INSERT (clave_nivel_logro, descripcion) VALUES (s.clave_nivel_logro, s.descripcion);
GO

INSERT INTO dbo.grado (id_nivel_educativo, numero_grado)
SELECT ne.id_nivel_educativo, v.numero_grado
FROM dbo.nivel_educativo ne
CROSS JOIN (VALUES (1), (2), (3), (4), (5), (6)) v(numero_grado)
WHERE ne.nombre_nivel = 'PRIMARIA'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.grado g
      WHERE g.id_nivel_educativo = ne.id_nivel_educativo AND g.numero_grado = v.numero_grado
  );
GO

INSERT INTO dbo.grado (id_nivel_educativo, numero_grado)
SELECT ne.id_nivel_educativo, v.numero_grado
FROM dbo.nivel_educativo ne
CROSS JOIN (VALUES (1), (2), (3)) v(numero_grado)
WHERE ne.nombre_nivel = 'SECUNDARIA'
  AND NOT EXISTS (
      SELECT 1 FROM dbo.grado g
      WHERE g.id_nivel_educativo = ne.id_nivel_educativo AND g.numero_grado = v.numero_grado
  );
GO

CREATE OR ALTER PROCEDURE dbo.limpiar_errores_validacion
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.validacion_error;
END
GO

CREATE OR ALTER PROCEDURE dbo.validar_clave_escuela
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_clave_escuela',
        'escuela',
        e.id_escuela,
        CONCAT('Clave de escuela invalida: ', ISNULL(e.clave_escuela, 'NULL'))
    FROM dbo.escuela e
    WHERE e.clave_escuela IS NULL
       OR LEN(LTRIM(RTRIM(e.clave_escuela))) <> 10
       OR UPPER(LTRIM(RTRIM(e.clave_escuela))) NOT LIKE '30[A-Z][A-Z][A-Z][0-9][0-9][0-9][0-9][A-Z]';
END
GO

CREATE OR ALTER PROCEDURE dbo.validar_grado_marginacion
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_grado_marginacion',
        'grado_marginacion',
        gm.id_grado_marginacion,
        CONCAT('Grado de marginacion invalido: ', ISNULL(gm.nombre_grado_marginacion, 'NULL'))
    FROM dbo.grado_marginacion gm
    WHERE gm.nombre_grado_marginacion IS NULL
       OR UPPER(LTRIM(RTRIM(gm.nombre_grado_marginacion))) NOT IN ('MUY BAJO', 'BAJO', 'MEDIO', 'ALTO', 'MUY ALTO');
END
GO

CREATE OR ALTER PROCEDURE dbo.validar_alumnos_evaluados
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
    SELECT
        'validar_alumnos_evaluados',
        'alumnos_evaluados',
        ae_total.id_escuela,
        CONCAT(
            'No coincide el total de alumnos evaluados. Total escuela = ',
            ae_total.cantidad,
            ', suma por grado = ',
            ISNULL(SUM(ae_grado.cantidad), 0)
        )
    FROM dbo.alumnos_evaluados ae_total
    LEFT JOIN dbo.alumnos_evaluados ae_grado
        ON ae_total.id_escuela = ae_grado.id_escuela
       AND ae_grado.id_grado IS NOT NULL
    WHERE ae_total.id_grado IS NULL
    GROUP BY ae_total.id_escuela, ae_total.cantidad
    HAVING ae_total.cantidad <> ISNULL(SUM(ae_grado.cantidad), 0);
END
GO

CREATE OR ALTER PROCEDURE dbo.validar_porcentaje_nivel_logro
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.validacion_error (nombre_validacion, tabla_origen, id_referencia, detalle)
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
    FROM dbo.resultado_logro rl
    INNER JOIN dbo.nivel_logro nl ON rl.id_nivel_logro = nl.id_nivel_logro
    WHERE nl.clave_nivel_logro IN ('INSUF', 'ELEM', 'BUENO', 'EXCEL')
    GROUP BY rl.id_escuela, rl.id_grado, rl.id_materia
    HAVING SUM(rl.porcentaje) < 99.99 OR SUM(rl.porcentaje) > 100.01;
END
GO

CREATE OR ALTER PROCEDURE dbo.validar_base_enlace
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.limpiar_errores_validacion;
    EXEC dbo.validar_clave_escuela;
    EXEC dbo.validar_grado_marginacion;
    EXEC dbo.validar_alumnos_evaluados;
    EXEC dbo.validar_porcentaje_nivel_logro;
END
GO
