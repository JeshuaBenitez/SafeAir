package com.safeair.emulator.api.client;

import com.safeair.emulator.api.dto.DtoSetup;

public interface Request {
    DtoSetup getSetup(String emulatorId);
}
