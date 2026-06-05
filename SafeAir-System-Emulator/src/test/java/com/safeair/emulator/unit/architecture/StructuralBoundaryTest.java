package com.safeair.emulator.unit.architecture;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

class StructuralBoundaryTest {

    @Test
    void directElectrodomesticInstantiation_onlyOccursInFactory() throws IOException {
        List<Path> javaFiles;
        try (Stream<Path> stream = Files.walk(Path.of("src/main/java/com/safeair/emulator"))) {
            javaFiles = stream
                    .filter(p -> p.toString().endsWith(".java"))
                    .collect(Collectors.toList());
        }

        for (Path file : javaFiles) {
            String content = Files.readString(file, StandardCharsets.UTF_8);
            if (file.toString().endsWith("ElectrodomesticFactory.java")) {
                continue;
            }
            assertTrue(
                    !content.contains("new MiniSplit(")
                            && !content.contains("new HumidifierPurifier(")
                            && !content.contains("new AirExtractor("),
                    "Direct electrodomestic instantiation found in " + file);
        }
    }
}
