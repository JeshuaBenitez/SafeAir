package com.safeair.emulator.api.mqtt;

import com.safeair.emulator.abstracts.SendInfo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class ConsolePublisher extends SendInfo {
    private static final Logger log = LoggerFactory.getLogger(ConsolePublisher.class);

    @Override
    public void send(Object data) {
        log.info("{}", data);
    }
}
