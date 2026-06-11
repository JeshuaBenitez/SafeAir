// Copy this file to env.js only for the environment you are running.
// Keep committed defaults empty so Docker local can use the Nginx /api proxy.
//
// Local ng serve:
//   API_BASE_URL: "http://localhost:3000"
//   MQTT_BROKER_URL: "ws://localhost:8084/mqtt"
//
// LAN example:
//   API_BASE_URL: "http://IP_PC_API:3000"
//   MQTT_BROKER_URL: "ws://IP_PC_DB_MQTT:8084/mqtt"
window.__env = {
  API_BASE_URL: "",
  MQTT_BROKER_URL: ""
};
