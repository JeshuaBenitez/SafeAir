package com.safeair.emulator.enlace.excel;

public class HojaConfig {

    public static final String ESPANOL = "ESPAÑOL";
    public static final String MATEMATICAS = "MATEMÁTICAS";
    public static final String GEOGRAFIA = "GEOGRAFÍA";
    public static final String[] NIVELES_LOGRO = {"INSUF", "ELEM", "BUENO", "EXCEL"};

    private final String nombreHoja;
    private final String nivelEducativo;
    private final int filaInicio;
    private final int columnaGradoMarginacion;
    private final int[] grados;
    private final int[] columnasPocoConfiable;
    private final int columnaTotalPocoConfiable;
    private final int[] columnasEvaluados;
    private final int columnaTotalEvaluados;
    private final PromedioMap[] promedios;
    private final LogroMap[] logros;

    public HojaConfig(
            String nombreHoja,
            String nivelEducativo,
            int filaInicio,
            int columnaGradoMarginacion,
            int[] grados,
            int[] columnasPocoConfiable,
            int columnaTotalPocoConfiable,
            int[] columnasEvaluados,
            int columnaTotalEvaluados,
            PromedioMap[] promedios,
            LogroMap[] logros
    ) {
        this.nombreHoja = nombreHoja;
        this.nivelEducativo = nivelEducativo;
        this.filaInicio = filaInicio;
        this.columnaGradoMarginacion = columnaGradoMarginacion;
        this.grados = grados;
        this.columnasPocoConfiable = columnasPocoConfiable;
        this.columnaTotalPocoConfiable = columnaTotalPocoConfiable;
        this.columnasEvaluados = columnasEvaluados;
        this.columnaTotalEvaluados = columnaTotalEvaluados;
        this.promedios = promedios;
        this.logros = logros;
    }

    public static HojaConfig primaria() {
        return new HojaConfig(
                "primaria",
                "PRIMARIA",
                3,
                80,
                new int[]{3, 4, 5, 6},
                new int[]{70, 71, 72, 73},
                74,
                new int[]{75, 76, 77, 78},
                79,
                new PromedioMap[]{
                        new PromedioMap(10, 3, ESPANOL),
                        new PromedioMap(11, 3, MATEMATICAS),
                        new PromedioMap(12, 3, GEOGRAFIA),
                        new PromedioMap(13, 4, ESPANOL),
                        new PromedioMap(14, 4, MATEMATICAS),
                        new PromedioMap(15, 4, GEOGRAFIA),
                        new PromedioMap(16, 5, ESPANOL),
                        new PromedioMap(17, 5, MATEMATICAS),
                        new PromedioMap(18, 5, GEOGRAFIA),
                        new PromedioMap(19, 6, ESPANOL),
                        new PromedioMap(20, 6, MATEMATICAS),
                        new PromedioMap(21, 6, GEOGRAFIA)
                },
                new LogroMap[]{
                        new LogroMap(22, 3, ESPANOL),
                        new LogroMap(26, 4, ESPANOL),
                        new LogroMap(30, 5, ESPANOL),
                        new LogroMap(34, 6, ESPANOL),
                        new LogroMap(38, 3, MATEMATICAS),
                        new LogroMap(42, 4, MATEMATICAS),
                        new LogroMap(46, 5, MATEMATICAS),
                        new LogroMap(50, 6, MATEMATICAS),
                        new LogroMap(54, 3, GEOGRAFIA),
                        new LogroMap(58, 4, GEOGRAFIA),
                        new LogroMap(62, 5, GEOGRAFIA),
                        new LogroMap(66, 6, GEOGRAFIA)
                }
        );
    }

    public static HojaConfig secundaria() {
        return new HojaConfig(
                "secundaria",
                "SECUNDARIA",
                3,
                53,
                new int[]{1, 2, 3},
                new int[]{45, 46, 47},
                48,
                new int[]{49, 50, 51},
                52,
                new PromedioMap[]{
                        new PromedioMap(10, 1, ESPANOL),
                        new PromedioMap(11, 1, MATEMATICAS),
                        new PromedioMap(12, 1, GEOGRAFIA),
                        new PromedioMap(13, 2, ESPANOL),
                        new PromedioMap(14, 2, MATEMATICAS),
                        new PromedioMap(15, 3, ESPANOL),
                        new PromedioMap(16, 3, MATEMATICAS)
                },
                new LogroMap[]{
                        new LogroMap(17, 1, ESPANOL),
                        new LogroMap(21, 2, ESPANOL),
                        new LogroMap(25, 3, ESPANOL),
                        new LogroMap(29, 1, MATEMATICAS),
                        new LogroMap(33, 2, MATEMATICAS),
                        new LogroMap(37, 3, MATEMATICAS),
                        new LogroMap(41, 1, GEOGRAFIA)
                }
        );
    }

    public String nombreHoja() {
        return nombreHoja;
    }

    public String nivelEducativo() {
        return nivelEducativo;
    }

    public int filaInicio() {
        return filaInicio;
    }

    public int columnaGradoMarginacion() {
        return columnaGradoMarginacion;
    }

    public int[] grados() {
        return grados;
    }

    public int[] columnasPocoConfiable() {
        return columnasPocoConfiable;
    }

    public int columnaTotalPocoConfiable() {
        return columnaTotalPocoConfiable;
    }

    public int[] columnasEvaluados() {
        return columnasEvaluados;
    }

    public int columnaTotalEvaluados() {
        return columnaTotalEvaluados;
    }

    public PromedioMap[] promedios() {
        return promedios;
    }

    public LogroMap[] logros() {
        return logros;
    }
}
