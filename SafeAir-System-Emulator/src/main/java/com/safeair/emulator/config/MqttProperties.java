package com.safeair.emulator.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "mqtt")
public class MqttProperties {
    private boolean enabled;
    private String host = "localhost";
    private int port = 8883;
    private final Tls tls = new Tls();
    private String username = "safeair";
    private String password = "safeair";
    private boolean consoleLogEnabled = true;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public int getPort() {
        return port;
    }

    public void setPort(int port) {
        this.port = port;
    }

    public Tls getTls() {
        return tls;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public boolean isConsoleLogEnabled() {
        return consoleLogEnabled;
    }

    public void setConsoleLogEnabled(boolean consoleLogEnabled) {
        this.consoleLogEnabled = consoleLogEnabled;
    }

    public static class Tls {
        private boolean enabled = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }
    }
}
