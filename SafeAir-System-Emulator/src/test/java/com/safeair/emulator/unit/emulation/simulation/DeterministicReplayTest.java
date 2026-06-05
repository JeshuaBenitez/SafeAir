package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.simulation.ConvergenceEvaluator;
import com.safeair.emulator.emulation.simulation.EmulatorSeedStrategy;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.emulation.simulation.SeededRandomSource;

/**
 * T030 — SC-010: same emulatorId → identical 300-tick replay.
 * SC-011: convergence within N_CONSECUTIVE ticks.
 */
class DeterministicReplayTest {

    private static final String ID_A = "EMU-0001";
    private static final String ID_B = "EMU-0002";

    private double[] runSimulation(String id, int ticks) {
        long seed = EmulatorSeedStrategy.seedFrom(id);
        SeededRandomSource rng = new SeededRandomSource(seed);
        Room room = new Room(25, 2, 5, rng);
        RoomEnvironmentHelper helper = new RoomEnvironmentHelper();
        // Fix external values
        room.externalTemperature(28.0);
        room.externalHumidity(55.0);
        room.externalCo2(420.0);
        room.externalPm25(12.0);

        double[] tempHistory = new double[ticks];
        for (int i = 0; i < ticks; i++) {
            helper.simulateEnvironment(room, null, null, null, rng);
            tempHistory[i] = room.temperature();
        }
        return tempHistory;
    }

    @Test
    void sameId_sameReplay_300ticks() {
        double[] run1 = runSimulation(ID_A, 300);
        double[] run2 = runSimulation(ID_A, 300);
        assertArrayEquals(run1, run2, 1e-15,
                "Same emulatorId must produce identical temperature sequence across 300 ticks");
    }

    @Test
    void differentIds_divergeSequence() {
        double[] runA = runSimulation(ID_A, 50);
        double[] runB = runSimulation(ID_B, 50);
        // At least some tick must differ
        boolean diverged = false;
        for (int i = 0; i < runA.length; i++) {
            if (Math.abs(runA[i] - runB[i]) > 1e-10) {
                diverged = true;
                break;
            }
        }
        assertTrue(diverged,
                "Different emulatorIds must produce divergent temperature sequences");
    }

    @Test
    void convergenceEvaluator_detectsNConsecutive() {
        // Feed values within epsilon for N_CONSECUTIVE ticks → convergedAll() must be true
        ConvergenceEvaluator evaluator = new ConvergenceEvaluator();
        Room fakeRoom = new Room(25, 2, 5, new com.safeair.emulator.unit.DeterministicRandomStub(0.17));
        double tTarget = fakeRoom.temperature();
        double hTarget = fakeRoom.humidity();
        double cTarget = fakeRoom.co2();
        double pTarget = fakeRoom.pm25();

        // Force room values to exactly match targets
        fakeRoom.temperature(tTarget);
        fakeRoom.humidity(hTarget);
        fakeRoom.co2(cTarget);
        fakeRoom.pm25(pTarget);

        for (int i = 0; i < DomainConstants.N_CONSECUTIVE; i++) {
            evaluator.update(fakeRoom, tTarget, hTarget, cTarget, pTarget);
        }
        assertTrue(evaluator.convergedAll(),
                "After " + DomainConstants.N_CONSECUTIVE + " consecutive within-epsilon ticks, convergedAll() must be true");
    }

    @Test
    void convergenceEvaluator_resets_onOutOfEpsilonTick() {
        ConvergenceEvaluator evaluator = new ConvergenceEvaluator();
        Room fakeRoom = new Room(25, 2, 5, new com.safeair.emulator.unit.DeterministicRandomStub(0.17));
        double tTarget = fakeRoom.temperature();
        double hTarget = fakeRoom.humidity();
        double cTarget = fakeRoom.co2();
        double pTarget = fakeRoom.pm25();

        // Feed N-1 in-epsilon then one out-of-range tick
        for (int i = 0; i < DomainConstants.N_CONSECUTIVE - 1; i++) {
            evaluator.update(fakeRoom, tTarget, hTarget, cTarget, pTarget);
        }
        // Set temperature far from target
        fakeRoom.temperature(tTarget + DomainConstants.TEMP_EPSILON + 5.0);
        evaluator.update(fakeRoom, tTarget, hTarget, cTarget, pTarget);

        assertFalse(evaluator.convergedAll(),
                "Out-of-epsilon tick should reset consecutive counter");
    }
}
