/**
 * Development Environment Configuration / Configuración de Entorno de Desarrollo
 * 
 * Usado para desarrollo local en una sola máquina
 * Used for local development on a single machine
 * 
 * Para ejecutar en RED LOCAL (LAN), cambia API_BASE_URL por la IP de la laptop de la API:
 * API_BASE_URL: 'http://IP_PC_API:3000'  (ajusta el placeholder según tu red)
 */

export const environment = {
  production: false,
  
  /**
   * Backend API Base URL
   * Desarrollo local: http://localhost:3000
   * Red local (LAN): http://IP_PC_API:3000 (usa la IP de la laptop donde corre la API)
   * Render producción: https://safeair-api.onrender.com
   * 
   * CONFIGURAR: Si vas a usar en LAN, cambia 'localhost' por la IP real de la API
   */
  API_BASE_URL: (window as any).__env?.API_BASE_URL || 'http://localhost:3000',
  
  /**
   * MQTT Broker WebSocket URL for emulator telemetry subscriptions
   * Desarrollo: ws://localhost:8084/mqtt (EMQX WebSocket port)
   * Red local: ws://IP_PC_DB_MQTT:8084/mqtt
   * Producción: wss://safeair-mqtt.onrender.com/mqtt
   */
  MQTT_BROKER_URL: (window as any).__env?.MQTT_BROKER_URL || 'ws://localhost:8084/mqtt',
  
  /**
   * Authentication source
   * 'api': Connect to real backend (default for integration)
   * 'mock': Use mock data (for testing UI in isolation)
   */
  AUTH_MODE: 'api',
  
  /**
   * Dashboard data source
   * 'api': Fetch real metrics from backend (default after Phase 2)
   * 'mock': Use simulated metrics (default for Phase 1, allows UI iteration)
   */
  DASHBOARD_MODE: 'api',
  
  /**
   * Feature flags for gradual rollout
   */
  features: {
    /**
     * Enable live dashboard metrics polling (Phase 2+)
     * When false: dashboard uses mock data
     * When true: dashboard polls /api/v1/rooms/{id}/metrics/current
     */
    liveDashboardMetrics: true,
    
    /**
     * Enable persistent session storage (Phase 3)
     * When false: session lost on page refresh
     * When true: session restored from localStorage
     */
    persistentSession: true,
    
    /**
     * Enable JWT authentication interceptor (Phase 3)
     * When false: no Authorization header on requests
     * When true: automatic JWT header injection
     */
    jwtInterceptor: true,
  },
};
