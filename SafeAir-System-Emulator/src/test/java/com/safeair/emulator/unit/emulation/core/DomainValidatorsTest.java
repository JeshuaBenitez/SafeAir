package com.safeair.emulator.unit.emulation.core;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.safeair.emulator.emulation.core.DomainValidators;

class DomainValidatorsTest {

    // MiniSplit [19, 30]
    @ParameterizedTest
    @ValueSource(ints = {19, 24, 30})
    void validateMiniSplit_valid(int v) {
        assertEquals(v, DomainValidators.validateMiniSplit(v));
    }

    @ParameterizedTest
    @ValueSource(ints = {18, 31, 0, -5})
    void validateMiniSplit_invalid_throws(int v) {
        assertThrows(IllegalArgumentException.class, () -> DomainValidators.validateMiniSplit(v));
    }

    // Humidifier [1, 5]
    @ParameterizedTest
    @ValueSource(ints = {1, 3, 5})
    void validateHumidifier_valid(int v) {
        assertEquals(v, DomainValidators.validateHumidifier(v));
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 6, -1})
    void validateHumidifier_invalid_throws(int v) {
        assertThrows(IllegalArgumentException.class, () -> DomainValidators.validateHumidifier(v));
    }

    // AirExtractor {0, 1}
    @Test
    void validateAirExtractor_zeroValid() {
        assertEquals(0, DomainValidators.validateAirExtractor(0));
    }

    @Test
    void validateAirExtractor_oneValid() {
        assertEquals(1, DomainValidators.validateAirExtractor(1));
    }

    @ParameterizedTest
    @ValueSource(ints = {-1, 2, 99})
    void validateAirExtractor_invalid_throws(int v) {
        assertThrows(IllegalArgumentException.class, () -> DomainValidators.validateAirExtractor(v));
    }

    // clamp
    @Test
    void clamp_valueWithinRange_unchanged() {
        assertEquals(5.0, DomainValidators.clamp(5.0, 0.0, 10.0), 1e-9);
    }

    @Test
    void clamp_valueBelowMin_clampsToMin() {
        assertEquals(0.0, DomainValidators.clamp(-3.0, 0.0, 10.0), 1e-9);
    }

    @Test
    void clamp_valueAboveMax_clampsToMax() {
        assertEquals(10.0, DomainValidators.clamp(15.0, 0.0, 10.0), 1e-9);
    }
}
