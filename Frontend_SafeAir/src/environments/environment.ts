/**
 * Development Environment Configuration / Configuración de Entorno de Desarrollo
 * 
 * Usado para desarrollo local en una sola máquina
 * Used for local development on a single machine
 */

export const environment = {
  production: false,
  
  /**
   * Backend API Base URL
   * Development: http://localhost:3000 (same machine)
   * Multi-device: http://192.168.x.x:3000 (different machine IP)
   * 
   * Configure via:
   * - Direct edit (dev only)
   * - Build-time substitution
   * - Runtime injection (e.g., from index.html or config server)
   */
  API_BASE_URL: 'http://localhost:3000',
  
  /**
   * MQTT Broker WebSocket URL for emulator telemetry subscriptions
   * Default: localhost:1883 (must support WebSocket)
   * 
   * Nota / Note: Not all MQTT brokers support WebSocket by default.
   * EMQX (default in this project) does. Configure port 8083 for WS.
   */
  MQTT_BROKER_URL: 'ws://localhost:1883/mqtt',
  
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
  DASHBOARD_MODE: 'mock',
  
  /**
   * Feature flags for gradual rollout
   */
  features: {
    /**
     * Enable live dashboard metrics polling (Phase 2+)
     * When false: dashboard uses mock data
     * When true: dashboard polls /api/v1/rooms/{id}/metrics/current
     */
    liveDashboardMetrics: false,
    
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
