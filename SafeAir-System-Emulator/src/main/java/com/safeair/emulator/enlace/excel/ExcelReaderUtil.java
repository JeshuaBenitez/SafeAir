package com.safeair.emulator.enlace.excel;

import java.math.BigDecimal;
import java.util.Locale;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FormulaEvaluator;
import org.apache.poi.ss.usermodel.Row;

public class ExcelReaderUtil {

    private final DataFormatter formatter = new DataFormatter(Locale.US);
    private FormulaEvaluator evaluator;

    public void setEvaluator(FormulaEvaluator evaluator) {
        this.evaluator = evaluator;
    }

    public String clean(Row row, int columnIndex) {
        return clean(cellString(row.getCell(columnIndex)));
    }

    public String clean(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace('\u00A0', ' ')
                .replaceAll("\\s+", " ")
                .trim()
                .toUpperCase(Locale.ROOT);
    }

    public boolean isBlank(Row row, int columnIndex) {
        return clean(row, columnIndex).isBlank();
    }

    public BigDecimal decimal(Row row, int columnIndex) {
        Cell cell = row.getCell(columnIndex);
        if (cell == null) {
            return null;
        }
        String value = cellString(cell)
                .replace(",", "")
                .replace("%", "")
                .trim();
        if (value.isBlank()
                || "-".equals(value)
                || "*".equals(value)
                || "NA".equalsIgnoreCase(value)
                || "N/A".equalsIgnoreCase(value)) {
            return null;
        }
        try {
            return new BigDecimal(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public String padDigits(String value, int length) {
        String cleanValue = clean(value);
        if (!cleanValue.matches("\\d+") || cleanValue.length() >= length) {
            return cleanValue;
        }
        return String.format("%0" + length + "d", Integer.parseInt(cleanValue));
    }

    private String cellString(Cell cell) {
        if (cell == null) {
            return "";
        }
        if (evaluator == null) {
            return formatter.formatCellValue(cell).trim();
        }
        return formatter.formatCellValue(cell, evaluator).trim();
    }
}
