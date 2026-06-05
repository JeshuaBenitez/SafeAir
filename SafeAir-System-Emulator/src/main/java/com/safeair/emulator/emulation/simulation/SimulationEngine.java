package com.safeair.emulator.emulation.simulation;

import com.safeair.emulator.abstracts.Electrodomestic;
import com.safeair.emulator.emulation.impl.AirExtractor;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.impl.MiniSplit;
import java.util.List;

public class SimulationEngine {
    private final RoomEnvironmentHelper helper;
    private final ConvergenceEvaluator convergenceEvaluator;

    public SimulationEngine(RoomEnvironmentHelper helper, ConvergenceEvaluator convergenceEvaluator) {
        this.helper = helper;
        this.convergenceEvaluator = convergenceEvaluator;
    }

    public void tick(Room room, List<Electrodomestic> devices, RandomSource randomSource) {
        MiniSplit miniSplit = null;
        HumidifierPurifier humidifier = null;
        AirExtractor extractor = null;

        for (Electrodomestic device : devices) {
            if (device instanceof MiniSplit ms) miniSplit = ms;
            if (device instanceof HumidifierPurifier hp) humidifier = hp;
            if (device instanceof AirExtractor ae) extractor = ae;
        }

        helper.simulateEnvironment(room, miniSplit, humidifier, extractor, randomSource);
        convergenceEvaluator.update(
                room,
                miniSplit == null ? room.externalTemperature() : miniSplit.getSetpoint(),
                50.0,
                room.externalCo2(),
                room.externalPm25());
    }

    public boolean convergedAll() {
        return convergenceEvaluator.convergedAll();
    }
}
