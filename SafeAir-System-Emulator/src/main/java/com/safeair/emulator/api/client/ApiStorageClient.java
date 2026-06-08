package com.safeair.emulator.api.client;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.dto.DtoSetup;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ApiStorageClient extends SendInfo implements Request {
    private static final Logger LOGGER = LoggerFactory.getLogger(ApiStorageClient.class);

    @Override
    public void send(Object data) {
        // Placeholder for external API forwarding.
    }

    @Override
    public DtoSetup getSetup(String emulatorId) {
        // DEFAULT CONFIGURATION: Used only at startup.
        // Dynamic room configuration will be received via MQTT from the API
        // and will replace this default.
        DtoSetup setup = new DtoSetup(emulatorId, 1, 35, 0, new int[] {1, 2, 3, 4}, new int[] {1, 2, 3});
        
        LOGGER.info("[{}] Initial (default) setup loaded from ApiStorageClient", emulatorId);
        LOGGER.info("[{}]   This default will be REPLACED when dynamic room config arrives via MQTT", emulatorId);
        LOGGER.info("[{}]   Default: area=35m², sensors=[1,2,3,4], devices=[1,2,3] (1 minisplit, 1 purifier, 1 extractor)", 
                emulatorId);
        
        return setup;
    }
}
