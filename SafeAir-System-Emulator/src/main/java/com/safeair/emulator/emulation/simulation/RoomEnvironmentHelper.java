package com.safeair.emulator.emulation.simulation;

import com.safeair.emulator.emulation.core.DomainConstants;
import com.safeair.emulator.emulation.core.DomainValidators;
import com.safeair.emulator.emulation.impl.AirExtractor;
import com.safeair.emulator.emulation.impl.HumidifierPurifier;
import com.safeair.emulator.emulation.impl.MiniSplit;

public class RoomEnvironmentHelper {

    public double computeDispersion(Room room) {
        double areaFactor = 1.0 / Math.sqrt(room.roomSquareMeters());
        double windowFactor = 1.0 + (room.windowCount() * DomainConstants.WINDOW_FACTOR_MULTIPLIER);
        double kEnv = room.dispersionRate() * windowFactor * areaFactor;
        return Math.max(kEnv, DomainConstants.K_ENV_FLOOR);
    }

    public void simulateEnvironment(
            Room room,
            MiniSplit miniSplit,
            HumidifierPurifier humidifier,
            AirExtractor extractor,
            RandomSource randomSource) {
        double kEnv = computeDispersion(room);

        double deltaTEnv = kEnv * (room.externalTemperature() - room.temperature());
        double deltaHEnv = kEnv * (room.externalHumidity() - room.humidity());
        double deltaCEnv = kEnv * (room.externalCo2() - room.co2());
        double deltaPEnv = kEnv * (room.externalPm25() - room.pm25());

        double deltaTAc = 0.0;
        if (miniSplit != null && miniSplit.isOn()) {
            double error = miniSplit.getSetpoint() - room.temperature();
            deltaTAc = DomainValidators.clamp(0.15 * error, -0.8, 0.8);
        }

        double deltaHDevice = 0.0;
        if (humidifier != null && humidifier.isOn()) {
            double kHum = 0.02 * humidifier.getLevel();
            deltaHDevice = kHum * (50.0 - room.humidity());
        }

        double deltaCExtractor = 0.0;
        if (extractor != null && extractor.isOn()) {
            deltaCExtractor = -0.12 * (room.co2() - room.externalCo2());
        }
        double occupancyC = room.closedEnvironment() ? 3.0 : 0.0;

        double deltaPDevice = 0.0;
        if (humidifier != null && humidifier.isOn()) {
            double kFilter = 0.01;
            deltaPDevice = -kFilter * humidifier.getLevel() * room.pm25();
        }

        double tempNoise = randomSource.nextDouble(-0.05, 0.05);
        double humNoise = randomSource.nextDouble(-0.2, 0.2);
        double co2Noise = randomSource.nextDouble(-1.0, 1.0);
        double pmNoise = randomSource.nextDouble(-0.5, 0.5);

        room.temperature(DomainValidators.clamp(room.temperature() + deltaTEnv + deltaTAc + tempNoise, DomainConstants.TEMP_MIN, DomainConstants.TEMP_MAX));
        room.humidity(DomainValidators.clamp(room.humidity() + deltaHEnv + deltaHDevice + humNoise, DomainConstants.HUMIDITY_MIN, DomainConstants.HUMIDITY_MAX));
        room.co2(Math.max(DomainConstants.CO2_MIN, room.co2() + deltaCEnv + deltaCExtractor + occupancyC + co2Noise));
        room.pm25(Math.max(DomainConstants.PM25_MIN, room.pm25() + deltaPEnv + deltaPDevice + pmNoise));
    }
}
