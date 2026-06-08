/**
 * Production Environment Configuration / Configuración de Entorno de Producción
 * 
 * Usado para producción - debe ser inyectado en tiempo de build o runtime
 * Used for production - should be injected at build or runtime
 */

export const environment = {
  production: true,
  
  /**
   * Backend API Base URL (MUST be set via build-time variable or runtime injection)
   * Examples:
   * - http://api.safeair.local
   * - http://192.168.1.20:3000 (for local LAN multi-device)
   * - https://api.safeair.cloud (remote)
   * 
   * Angular Build: ng build --configuration production --define API_BASE_URL=...
   * Or environment variable: process.env.API_BASE_URL
   */
  API_BASE_URL: (window as any).__env?.API_BASE_URL || '',
  
  /**
   * MQTT Broker WebSocket URL for emulator telemetry subscriptions
   * Production should use:
   * - Secure WebSocket: wss://broker.safeair.local/mqtt
   * - Same network LAN: ws://192.168.1.20:8083/mqtt
   * 
   * Ensure MQTT broker is accessible from frontend machine
   */
  MQTT_BROKER_URL: (window as any).__env?.MQTT_BROKER_URL || 'ws://localhost:8084/mqtt',
  
  /**
   * Authentication source - always 'api' in production
   */
  AUTH_MODE: 'api',
  
  /**
   * Dashboard data source - always 'api' in production
   */
  DASHBOARD_MODE: 'api',
  
  /**
   * Feature flags - all enabled in production
   */
  features: {
    liveDashboardMetrics: true,
    persistentSession: true,
    jwtInterceptor: true,
  },
};
