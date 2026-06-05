package com.safeair.emulator.api.rest;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "ok");
        return response;
    }

    @GetMapping("/")
    public Map<String, String> root() {
        Map<String, String> response = new HashMap<>();
        response.put("service", "SafeAir Emulator");
        response.put("status", "running");
        return response;
    }
}
