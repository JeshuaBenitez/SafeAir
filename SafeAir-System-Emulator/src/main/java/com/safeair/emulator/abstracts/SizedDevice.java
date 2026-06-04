package com.safeair.emulator.abstracts;

public abstract class SizedDevice {
    protected int width;
    protected int height;

    protected SizedDevice(int width, int height) {
        this.width = width;
        this.height = height;
    }
}
