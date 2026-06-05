package com.safeair.emulator.api.dto;

import java.util.Arrays;

public final class DtoSetup {
    private final String emulatorId;
    private final int updateIntervalSec;
    private final int roomSquareMeters;
    private final int windowCount;
    private final int[] sensorTypes;
    private final int[] deviceTypes;

    public DtoSetup(
            String emulatorId,
            int updateIntervalSec,
            int roomSquareMeters,
            int windowCount,
            int[] sensorTypes,
            int[] deviceTypes) {
        this.emulatorId = emulatorId;
        this.updateIntervalSec = updateIntervalSec;
        this.roomSquareMeters = roomSquareMeters;
        this.windowCount = windowCount;
        this.sensorTypes = sensorTypes == null ? new int[0] : Arrays.copyOf(sensorTypes, sensorTypes.length);
        this.deviceTypes = deviceTypes == null ? new int[0] : Arrays.copyOf(deviceTypes, deviceTypes.length);
    }

    public String emulatorId() {
        return emulatorId;
    }

    public int updateIntervalSec() {
        return updateIntervalSec;
    }

    public int roomSquareMeters() {
        return roomSquareMeters;
    }

    public int windowCount() {
        return windowCount;
    }

    public int[] sensorTypes() {
        return Arrays.copyOf(sensorTypes, sensorTypes.length);
    }

    public int[] deviceTypes() {
        return Arrays.copyOf(deviceTypes, deviceTypes.length);
    }
}
