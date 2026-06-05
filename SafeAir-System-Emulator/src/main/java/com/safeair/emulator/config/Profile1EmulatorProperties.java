package com.safeair.emulator.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "safeair.profile1")
public class Profile1EmulatorProperties {
    private List<EmulatorDefinition> emulators = new ArrayList<>();

    public List<EmulatorDefinition> getEmulators() {
        return emulators;
    }

    public void setEmulators(List<EmulatorDefinition> emulators) {
        this.emulators = emulators;
    }

    public static class EmulatorDefinition {
        private String emulatorId;
        private int updateIntervalSec = 1;
        private int roomSquareMeters = 35;
        private int windowCount = 0;
        private List<Integer> sensorTypes = new ArrayList<>();
        private List<Integer> deviceTypes = new ArrayList<>();

        public String getEmulatorId() {
            return emulatorId;
        }

        public void setEmulatorId(String emulatorId) {
            this.emulatorId = emulatorId;
        }

        public int getUpdateIntervalSec() {
            return updateIntervalSec;
        }

        public void setUpdateIntervalSec(int updateIntervalSec) {
            this.updateIntervalSec = updateIntervalSec;
        }

        public int getRoomSquareMeters() {
            return roomSquareMeters;
        }

        public void setRoomSquareMeters(int roomSquareMeters) {
            this.roomSquareMeters = roomSquareMeters;
        }

        public int getWindowCount() {
            return windowCount;
        }

        public void setWindowCount(int windowCount) {
            this.windowCount = windowCount;
        }

        public List<Integer> getSensorTypes() {
            return sensorTypes;
        }

        public void setSensorTypes(List<Integer> sensorTypes) {
            this.sensorTypes = sensorTypes;
        }

        public List<Integer> getDeviceTypes() {
            return deviceTypes;
        }

        public void setDeviceTypes(List<Integer> deviceTypes) {
            this.deviceTypes = deviceTypes;
        }
    }
}
