package com.safeair.emulator.unit;

import com.safeair.emulator.api.dto.DtoSetup;
import com.safeair.emulator.emulation.impl.ElectrodomesticFactory;
import com.safeair.emulator.emulation.impl.SensorFactory;

public final class TestFixtures {
    private TestFixtures() {}

    public static final String FIXED_EMULATOR_ID_A = "EMU-0001";
    public static final String FIXED_EMULATOR_ID_B = "EMU-0002";

    public static DtoSetup defaultSetup() {
        return new DtoSetup(
                FIXED_EMULATOR_ID_A,
                5,
                20,
                2,
                new int[]{SensorFactory.TEMPERATURE, SensorFactory.HUMIDITY,
                           SensorFactory.CO2, SensorFactory.PM25},
                new int[]{ElectrodomesticFactory.MINI_SPLIT,
                           ElectrodomesticFactory.HUMIDIFIER_PURIFIER,
                           ElectrodomesticFactory.AIR_EXTRACTOR});
    }

    public static DtoSetup closedRoomSetup() {
        return new DtoSetup(
                FIXED_EMULATOR_ID_A,
                5,
                25,
                0,
                new int[]{SensorFactory.CO2},
                new int[]{});
    }

    public static DtoSetup minimalSetup(String id) {
        return new DtoSetup(id, 5, 16, 1,
                new int[]{SensorFactory.TEMPERATURE},
                new int[]{});
    }
}
