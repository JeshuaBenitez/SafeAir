package com.safeair.emulator.api.client;

import com.safeair.emulator.abstracts.SendInfo;
import com.safeair.emulator.api.dto.DtoSetup;

public class ApiStorageClient extends SendInfo implements Request {
    @Override
    public void send(Object data) {
        // Placeholder for external API forwarding.
    }

    @Override
    public DtoSetup getSetup(String emulatorId) {
        return new DtoSetup(emulatorId, 1, 35, 0, new int[] {1, 2, 3, 4}, new int[] {1, 2, 3});
    }
}
