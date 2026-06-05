package com.safeair.emulator.unit.emulation.simulation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.simulation.Room;
import com.safeair.emulator.emulation.simulation.RoomEnvironmentHelper;
import com.safeair.emulator.unit.DeterministicRandomStub;

/**
 * T024 — FR-008: Dispersion computation — formula contract tests.
 * areaFactor = 1/sqrt(A), windowFactor = 1 + (W * 0.08), k_env = rate * wf * af, floor 0.01
 */
class DispersionComputationTest {

    private final RoomEnvironmentHelper helper = new RoomEnvironmentHelper();

    private Room roomWith(int area, int windows, double dispersionRate) {
        DeterministicRandomStub stub = new DeterministicRandomStub(dispersionRate);
        return new Room(area, windows, 5, stub);
    }

    @Test
    void dispersion_formula_areaAffectsResult() {
        // Larger room → smaller areaFactor → smaller k_env
        Room small = roomWith(16, 2, 0.17);
        Room large = roomWith(100, 2, 0.17);
        double kSmall = helper.computeDispersion(small);
        double kLarge = helper.computeDispersion(large);
        assertTrue(kSmall > kLarge,
                "Smaller room should produce larger dispersion coefficient");
    }

    @Test
    void dispersion_formula_windowsAffectResult() {
        // More windows → larger windowFactor → larger k_env
        Room noWindow = roomWith(25, 0, 0.17);
        Room twoWindow = roomWith(25, 2, 0.17);
        double k0 = helper.computeDispersion(noWindow);
        double k2 = helper.computeDispersion(twoWindow);
        assertTrue(k2 > k0,
                "More windows should produce larger dispersion coefficient");
    }

    @Test
    void dispersion_windowFactorMultiplier_isConstitutionValue() {
        // windowFactor = 1 + (W * WINDOW_FACTOR_MULTIPLIER), verify fraction is exactly 0.08
        assertEquals(0.08, DomainConstants.WINDOW_FACTOR_MULTIPLIER, 1e-12,
                "WINDOW_FACTOR_MULTIPLIER must be 0.08 per constitution v2.0.0");
    }

    @Test
    void dispersion_smallArea_manyWindows_exactFormula() {
        // area=4, windows=3, dispersionRate=0.17
        // areaFactor = 1/sqrt(4) = 0.5
        // windowFactor = 1 + (3 * 0.08) = 1.24
        // k_env = 0.17 * 1.24 * 0.5 = 0.1054
        Room room = roomWith(4, 3, 0.17);
        double expected = 0.17 * (1.0 + 3 * 0.08) * (1.0 / Math.sqrt(4));
        assertEquals(expected, helper.computeDispersion(room), 1e-9);
    }

    @Test
    void dispersion_floorApplied_neverBelowKenvFloor() {
        // Use tiny dispersion rate to trigger floor
        Room room = roomWith(1000000, 0, 0.00001);
        double k = helper.computeDispersion(room);
        assertTrue(k >= DomainConstants.K_ENV_FLOOR,
                "k_env must never drop below K_ENV_FLOOR = " + DomainConstants.K_ENV_FLOOR);
    }

    @Test
    void dispersion_closedRoom_floorStillApplied() {
        Room room = roomWith(50, 0, 0.15);
        double k = helper.computeDispersion(room);
        assertTrue(k >= DomainConstants.K_ENV_FLOOR);
    }
}
