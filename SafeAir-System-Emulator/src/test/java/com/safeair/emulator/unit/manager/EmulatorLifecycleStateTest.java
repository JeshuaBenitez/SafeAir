package com.safeair.emulator.unit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

import com.safeair.emulator.manager.EmulatorLifecycleState;

class EmulatorLifecycleStateTest {

    @Test
    void allStatesPresent() {
        EmulatorLifecycleState[] states = EmulatorLifecycleState.values();
        assertEquals(5, states.length);
    }

    @Test
    void ordinalOrdering_createdFirst() {
        assertEquals(0, EmulatorLifecycleState.CREATED.ordinal());
    }

    @Test
    void stoppedIsLast() {
        EmulatorLifecycleState[] states = EmulatorLifecycleState.values();
        assertEquals(EmulatorLifecycleState.STOPPED, states[states.length - 1]);
    }

    @Test
    void valueOf_valid() {
        assertEquals(EmulatorLifecycleState.RUNNING,
                EmulatorLifecycleState.valueOf("RUNNING"));
    }
}
