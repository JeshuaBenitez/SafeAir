package com.safeair.emulator.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "safeair.emulator")
public class EmulatorRuntimeProperties {
    private String ids = "";
    private boolean dynamicProvisioningOnly;

    public String getIds() {
        return ids;
    }

    public void setIds(String ids) {
        this.ids = ids;
    }

    public boolean isDynamicProvisioningOnly() {
        return dynamicProvisioningOnly;
    }

    public void setDynamicProvisioningOnly(boolean dynamicProvisioningOnly) {
        this.dynamicProvisioningOnly = dynamicProvisioningOnly;
    }
}
