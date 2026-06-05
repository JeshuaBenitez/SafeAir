package com.safeair.emulator.unit.factories;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.impl.AirExtractor;
import com.safeair.emulator.emulation.impl.ElectrodomesticFactory;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.impl.MiniSplit;

class ElectrodomesticFactoryTest {

    private final ElectrodomesticFactory factory = new ElectrodomesticFactory();

    @Test
    void createMiniSplit_returnsMiniSplitInstance() {
        Electrodomestic e = factory.create(ElectrodomesticFactory.MINI_SPLIT);
        assertInstanceOf(MiniSplit.class, e);
    }

    @Test
    void createHumidifierPurifier_returnsHumidifierPurifierInstance() {
        Electrodomestic e = factory.create(ElectrodomesticFactory.HUMIDIFIER_PURIFIER);
        assertInstanceOf(HumidifierPurifier.class, e);
    }

    @Test
    void createAirExtractor_returnsAirExtractorInstance() {
        Electrodomestic e = factory.create(ElectrodomesticFactory.AIR_EXTRACTOR);
        assertInstanceOf(AirExtractor.class, e);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 4, 99, -1})
    void createUnknownType_throwsIllegalArgument(int type) {
        assertThrows(IllegalArgumentException.class,
                () -> factory.create(type));
    }
}
