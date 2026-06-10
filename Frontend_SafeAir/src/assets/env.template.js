// Copy this file to env.js only for the environment you are running.
// Keep committed defaults empty so Docker local can use the Nginx /api proxy.
//
// Local ng serve:
//   API_BASE_URL: "http://localhost:3000"
//   MQTT_BROKER_URL: "ws://localhost:8084/mqtt"
//
// Tailscale example:
//   API_BASE_URL: "http://100.66.40.85:3000"
//   MQTT_BROKER_URL: "ws://100.79.106.54:8084/mqtt"
window.__env = {
  API_BASE_URL: "",
  MQTT_BROKER_URL: ""
};
