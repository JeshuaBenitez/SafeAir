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
    private String clientIdPrefix = "safeair-emulator";
    private int keepAliveSeconds = 60;
    private int connectionTimeoutSeconds = 10;
    private int maxInflight = 100;
    private int publishWarningIntervalSeconds = 30;
    private int telemetryPendingCapacity = 100;
    private int telemetryRetryDelayMillis = 1_000;
    private boolean logStacktrace = false;

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

    public String getClientIdPrefix() {
        return clientIdPrefix;
    }

    public void setClientIdPrefix(String clientIdPrefix) {
        this.clientIdPrefix = clientIdPrefix;
    }

    public int getKeepAliveSeconds() {
        return keepAliveSeconds;
    }

    public void setKeepAliveSeconds(int keepAliveSeconds) {
        this.keepAliveSeconds = keepAliveSeconds;
    }

    public int getConnectionTimeoutSeconds() {
        return connectionTimeoutSeconds;
    }

    public void setConnectionTimeoutSeconds(int connectionTimeoutSeconds) {
        this.connectionTimeoutSeconds = connectionTimeoutSeconds;
    }

    public int getMaxInflight() {
        return maxInflight;
    }

    public void setMaxInflight(int maxInflight) {
        this.maxInflight = maxInflight;
    }

    public int getPublishWarningIntervalSeconds() {
        return publishWarningIntervalSeconds;
    }

    public void setPublishWarningIntervalSeconds(int publishWarningIntervalSeconds) {
        this.publishWarningIntervalSeconds = publishWarningIntervalSeconds;
    }

    public int getTelemetryPendingCapacity() {
        return telemetryPendingCapacity;
    }

    public void setTelemetryPendingCapacity(int telemetryPendingCapacity) {
        this.telemetryPendingCapacity = telemetryPendingCapacity;
    }

    public int getTelemetryRetryDelayMillis() {
        return telemetryRetryDelayMillis;
    }

    public void setTelemetryRetryDelayMillis(int telemetryRetryDelayMillis) {
        this.telemetryRetryDelayMillis = telemetryRetryDelayMillis;
    }

    public boolean isLogStacktrace() {
        return logStacktrace;
    }

    public void setLogStacktrace(boolean logStacktrace) {
        this.logStacktrace = logStacktrace;
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
