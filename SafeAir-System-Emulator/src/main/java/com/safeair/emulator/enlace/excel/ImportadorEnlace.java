package com.safeair.emulator.enlace.excel;

import com.safeair.emulator.enlace.db.DatabaseConnectionInfo;
import com.safeair.emulator.enlace.db.EnlaceDatabaseConfig;
import java.io.File;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.DriverManager;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;

public class ImportadorEnlace {

    private final DatabaseConnectionInfo postgres;
    private Connection connection;
    private ExcelReaderUtil excel;
    private CatalogoRepository catalogos;
    private EscuelaRepository escuelas;
    private ResultadoRepository resultados;
    private AlumnoRepository alumnos;
    private int filasPrimaria;
    private int filasSecundaria;
    private int escuelasProcesadas;
    private int promediosProcesados;
    private int logrosProcesados;
    private int alumnosProcesados;

    public ImportadorEnlace() {
        this(EnlaceDatabaseConfig.postgresql());
    }

    public ImportadorEnlace(DatabaseConnectionInfo postgres) {
        this.postgres = postgres;
    }

    public void importar(String rutaExcel) throws Exception {
        File archivo = new File(rutaExcel);
        if (!archivo.exists()) {
            throw new IllegalArgumentException("No existe el archivo: " + archivo.getAbsolutePath());
        }

        try (Connection postgresConnection = DriverManager.getConnection(
                postgres.jdbcUrl(),
                postgres.user(),
                postgres.password());
                Workbook workbook = WorkbookFactory.create(archivo)) {
            connection = postgresConnection;
            connection.setAutoCommit(false);
            excel = new ExcelReaderUtil();
            excel.setEvaluator(workbook.getCreationHelper().createFormulaEvaluator());
            catalogos = new CatalogoRepository(connection);
            escuelas = new EscuelaRepository(connection);
            resultados = new ResultadoRepository(connection);
            alumnos = new AlumnoRepository(connection);

            catalogos.ensureBaseCatalogs();
            procesarHoja(workbook, HojaConfig.primaria());
            procesarHoja(workbook, HojaConfig.secundaria());

            connection.commit();
            imprimirResumen();
        } catch (Exception e) {
            if (connection != null) {
                connection.rollback();
            }
            throw e;
        }
    }

    private void procesarHoja(Workbook workbook, HojaConfig config) throws Exception {
        Sheet sheet = workbook.getSheet(config.nombreHoja());
        if (sheet == null) {
            throw new IllegalStateException("No existe la hoja: " + config.nombreHoja());
        }

        for (int i = config.filaInicio(); i <= sheet.getLastRowNum(); i++) {
            Row row = sheet.getRow(i);
            if (row == null || excel.isBlank(row, 2)) {
                continue;
            }
            int idEscuela = procesarDatosBase(row, config);
            procesarPromedios(row, idEscuela, config);
            procesarLogros(row, idEscuela, config);
            procesarAlumnosPocoConfiables(row, idEscuela, config);
            procesarAlumnosEvaluados(row, idEscuela, config);
            if ("PRIMARIA".equals(config.nivelEducativo())) {
                filasPrimaria++;
            } else {
                filasSecundaria++;
            }
        }
    }

    private int procesarDatosBase(Row row, HojaConfig config) throws Exception {
        String claveEntidad = excel.padDigits(excel.clean(row, 0), 2);
        String nombreEntidad = excel.clean(row, 1);
        String claveEscuela = excel.clean(row, 2);
        String turno = excel.clean(row, 3);
        String nombreEscuela = excel.clean(row, 4);
        String tipoEscuela = excel.clean(row, 5);
        String claveMunicipio = excel.padDigits(excel.clean(row, 6), 3);
        String nombreMunicipio = excel.clean(row, 7);
        String claveLocalidad = excel.padDigits(excel.clean(row, 8), 4);
        String nombreLocalidad = excel.clean(row, 9);
        String gradoMarginacion = excel.clean(row, config.columnaGradoMarginacion());

        int idEntidad = catalogos.getOrCreateEntidad(claveEntidad, nombreEntidad);
        int idMunicipio = catalogos.getOrCreateMunicipio(idEntidad, claveMunicipio, nombreMunicipio);
        int idLocalidad = catalogos.getOrCreateLocalidad(idMunicipio, claveLocalidad, nombreLocalidad);
        int idNivelEducativo = catalogos.getOrCreateSimple(
                "nivel_educativo", "id_nivel_educativo", "nombre_nivel", config.nivelEducativo());
        int idTurno = catalogos.getOrCreateSimple("turno", "id_turno", "nombre_turno", turno);
        int idTipoEscuela = catalogos.getOrCreateSimple(
                "tipo_escuela", "id_tipo_escuela", "nombre_tipo_escuela", tipoEscuela);
        int idGradoMarginacion = catalogos.getOrCreateSimple(
                "grado_marginacion", "id_grado_marginacion", "nombre_grado_marginacion", gradoMarginacion);

        escuelasProcesadas++;
        return escuelas.getOrCreateEscuela(
                claveEscuela,
                nombreEscuela,
                idLocalidad,
                idNivelEducativo,
                idTurno,
                idTipoEscuela,
                idGradoMarginacion);
    }

    private void procesarPromedios(Row row, int idEscuela, HojaConfig config) throws Exception {
        int idNivelEducativo = catalogos.getOrCreateSimple(
                "nivel_educativo", "id_nivel_educativo", "nombre_nivel", config.nivelEducativo());
        for (PromedioMap promedio : config.promedios()) {
            BigDecimal valor = excel.decimal(row, promedio.columna());
            if (valor == null) {
                continue;
            }
            int idGrado = catalogos.getOrCreateGrado(idNivelEducativo, promedio.grado());
            int idMateria = catalogos.getOrCreateSimple(
                    "materia", "id_materia", "nombre_materia", promedio.materia());
            resultados.upsertResultadoPromedio(idEscuela, idGrado, idMateria, valor);
            promediosProcesados++;
        }
    }

    private void procesarLogros(Row row, int idEscuela, HojaConfig config) throws Exception {
        int idNivelEducativo = catalogos.getOrCreateSimple(
                "nivel_educativo", "id_nivel_educativo", "nombre_nivel", config.nivelEducativo());
        for (LogroMap logro : config.logros()) {
            int idGrado = catalogos.getOrCreateGrado(idNivelEducativo, logro.grado());
            int idMateria = catalogos.getOrCreateSimple("materia", "id_materia", "nombre_materia", logro.materia());
            for (int i = 0; i < HojaConfig.NIVELES_LOGRO.length; i++) {
                BigDecimal porcentaje = excel.decimal(row, logro.columnaInicial() + i);
                if (porcentaje == null) {
                    continue;
                }
                String claveNivelLogro = HojaConfig.NIVELES_LOGRO[i];
                int idNivelLogro = catalogos.getOrCreateNivelLogro(
                        claveNivelLogro, descripcionNivelLogro(claveNivelLogro));
                resultados.upsertResultadoLogro(idEscuela, idGrado, idMateria, idNivelLogro, porcentaje);
                logrosProcesados++;
            }
        }
    }

    private void procesarAlumnosPocoConfiables(Row row, int idEscuela, HojaConfig config) throws Exception {
        procesarAlumnos(
                row,
                idEscuela,
                config,
                config.columnasPocoConfiable(),
                config.columnaTotalPocoConfiable(),
                "alumnos_resultado_poco_confiable",
                "id_alumnos_poco_confiable");
    }

    private void procesarAlumnosEvaluados(Row row, int idEscuela, HojaConfig config) throws Exception {
        procesarAlumnos(
                row,
                idEscuela,
                config,
                config.columnasEvaluados(),
                config.columnaTotalEvaluados(),
                "alumnos_evaluados",
                "id_alumnos_evaluados");
    }

    private void procesarAlumnos(
            Row row,
            int idEscuela,
            HojaConfig config,
            int[] columnasPorGrado,
            int columnaTotalEscuela,
            String tabla,
            String columnaId
    ) throws Exception {
        int idNivelEducativo = catalogos.getOrCreateSimple(
                "nivel_educativo", "id_nivel_educativo", "nombre_nivel", config.nivelEducativo());
        int[] grados = config.grados();
        for (int i = 0; i < grados.length; i++) {
            BigDecimal cantidad = excel.decimal(row, columnasPorGrado[i]);
            if (cantidad == null) {
                continue;
            }
            int idGrado = catalogos.getOrCreateGrado(idNivelEducativo, grados[i]);
            alumnos.upsertAlumnos(tabla, columnaId, idEscuela, idGrado, cantidad);
            alumnosProcesados++;
        }
        BigDecimal totalEscuela = excel.decimal(row, columnaTotalEscuela);
        if (totalEscuela != null) {
            alumnos.upsertAlumnos(tabla, columnaId, idEscuela, null, totalEscuela);
            alumnosProcesados++;
        }
    }

    private String descripcionNivelLogro(String clave) {
        return switch (clave) {
            case "INSUF" -> "INSUFICIENTE";
            case "ELEM" -> "ELEMENTAL";
            case "BUENO" -> "BUENO";
            case "EXCEL" -> "EXCELENTE";
            default -> clave;
        };
    }

    private void imprimirResumen() {
        System.out.println("Poblacion finalizada correctamente.");
        System.out.println("Filas primaria procesadas: " + filasPrimaria);
        System.out.println("Filas secundaria procesadas: " + filasSecundaria);
        System.out.println("Escuelas procesadas: " + escuelasProcesadas);
        System.out.println("Promedios procesados: " + promediosProcesados);
        System.out.println("Resultados por nivel de logro procesados: " + logrosProcesados);
        System.out.println("Registros de alumnos procesados: " + alumnosProcesados);
    }
}
