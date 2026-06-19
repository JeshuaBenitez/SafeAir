import dotenv from "dotenv";
import fs from "fs";
import mqtt from "mqtt";
import readline from "readline";
import { randomUUID } from "crypto";
import {
  CLI_CONFIG_PATH,
  getDefaultApiUrl,
  getDefaultMqttUrl,
  DEFAULT_LOG_INTERVAL_MS,
  DEFAULT_LOG_LIMIT
} from "./constants";

dotenv.config();

type Options = Record<string, string | boolean>;
type Config = { token?: string; apiUrl?: string; email?: string };
type JsonValue = Record<string, unknown> | unknown[];

function parseOptions(args: string[]): { positional: string[]; options: Options } {
  const positional: string[] = [];
  const options: Options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return { positional, options };
}

function option(options: Options, name: string): string | undefined {
  const value = options[name];
  return typeof value === "string" ? value : undefined;
}

function boolOption(options: Options, name: string): boolean {
  return options[name] === true || options[name] === "true";
}

function readConfig(): Config {
  try {
    return JSON.parse(fs.readFileSync(CLI_CONFIG_PATH, "utf8")) as Config;
  } catch {
    return {};
  }
}

function writeConfig(config: Config): void {
  fs.writeFileSync(CLI_CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function apiUrl(): string {
  return getDefaultApiUrl();
}

function mqttUrl(): string {
  return getDefaultMqttUrl();
}

function token(): string | undefined {
  return process.env.SAFEAIR_TOKEN || readConfig().token;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function apiRequest<T = unknown>(method: string, route: string, body?: unknown, auth = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const currentToken = token();
  if (auth && currentToken) {
    headers.Authorization = "Bearer " + currentToken;
  }

  const response = await fetch(apiUrl() + route, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const data = text ? parseJson(text) : null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data
      ? String((data as { message?: unknown }).message)
      : data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error)
        : text || response.statusText;
    throw new Error("HTTP " + response.status + ": " + message);
  }

  return data as T;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function print(data: unknown, asJson: boolean): void {
  if (asJson || !Array.isArray(data)) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  printTable(data as Record<string, unknown>[]);
}

function printTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    console.log("(empty)");
    return;
  }

  const keys = Object.keys(rows[0]).filter((key) => !["password", "passwordHash", "accessToken"].includes(key));
  const widths = keys.map((key) => Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length)));
  console.log(keys.map((key, index) => key.padEnd(widths[index])).join("  "));
  console.log(keys.map((_, index) => "-".repeat(widths[index])).join("  "));
  for (const row of rows) {
    console.log(keys.map((key, index) => String(row[key] ?? "").padEnd(widths[index])).join("  "));
  }
}

function envelope(source: string, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    correlationId: randomUUID(),
    source,
    timestamp: new Date().toISOString(),
    ...payload
  };
}

async function publishMqtt(topic: string, payload: Record<string, unknown>): Promise<void> {
  const client = mqtt.connect(mqttUrl());
  await new Promise<void>((resolve, reject) => {
    client.once("connect", () => resolve());
    client.once("error", reject);
  });

  await new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

  client.end();
  console.log("MQTT published " + topic);
}

async function findUserByEmail(email: string): Promise<{ id: string; email: string }> {
  return apiRequest("GET", "/api/v1/users?email=" + encodeURIComponent(email));
}

async function auth(command: string, options: Options): Promise<void> {
  if (command === "login") {
    const email = option(options, "email") ?? await prompt("Email: ");
    const password = option(options, "password") ?? await prompt("Password: ");
    const result = await apiRequest<Record<string, unknown>>("POST", "/api/v1/auth/login", { email, password }, false);

    if (result.requiresOtp) {
      const code = option(options, "otp") ?? await prompt("OTP: ");
      const verified = await apiRequest<Record<string, unknown>>("POST", "/api/v1/auth/verify-otp", { email, code }, false);
      saveLogin(email, verified);
      return;
    }

    saveLogin(email, result);
    return;
  }

  if (command === "whoami") {
    print(await apiRequest("GET", "/api/v1/auth/me"), boolOption(options, "json"));
    return;
  }

  if (command === "logout") {
    const config = readConfig();
    delete config.token;
    writeConfig(config);
    console.log("Logged out");
    return;
  }

  throw new Error("Unknown auth command");
}

function saveLogin(email: string, result: Record<string, unknown>): void {
  const accessToken = typeof result.accessToken === "string" ? result.accessToken : undefined;
  if (!accessToken) {
    throw new Error("Login did not return an access token");
  }

  writeConfig({ ...readConfig(), apiUrl: apiUrl(), email, token: accessToken });
  console.log("Login OK for " + email);
}

async function users(command: string, options: Options): Promise<void> {
  if (command === "list") {
    const result = await apiRequest<{ users: unknown[] }>("GET", "/api/v1/users");
    print(result.users, boolOption(options, "json"));
    return;
  }

  if (command === "get") {
    print(await apiRequest("GET", "/api/v1/users?email=" + encodeURIComponent(requireOption(options, "email"))), boolOption(options, "json"));
    return;
  }

  if (command === "create") {
    const body = {
      email: requireOption(options, "email"),
      firstName: option(options, "firstName"),
      lastName: option(options, "lastName"),
      password: requireOption(options, "password"),
      role: option(options, "role")
    };
    print(await apiRequest("POST", "/api/v1/users", body), boolOption(options, "json"));
    return;
  }

  const user = await findUserByEmail(requireOption(options, "email"));
  if (command === "update") {
    print(await apiRequest("PATCH", "/api/v1/users/" + user.id, {
      firstName: option(options, "firstName"),
      lastName: option(options, "lastName"),
      role: option(options, "role")
    }), boolOption(options, "json"));
    return;
  }

  if (command === "update-email") {
    print(await apiRequest("PATCH", "/api/v1/users/" + user.id + "/email", { newEmail: requireOption(options, "newEmail") }), boolOption(options, "json"));
    return;
  }

  if (command === "reset-password") {
    await apiRequest("PATCH", "/api/v1/users/" + user.id + "/password", { password: requireOption(options, "password") });
    console.log("Password updated");
    return;
  }

  if (command === "disable" || command === "enable") {
    print(await apiRequest("PATCH", "/api/v1/users/" + user.id + "/status", { enabled: command === "enable" }), boolOption(options, "json"));
    return;
  }

  throw new Error("Unknown users command");
}

async function rooms(command: string, options: Options): Promise<void> {
  if (command === "list") {
    const user = option(options, "user");
    const route = user ? "/api/v1/rooms?user=" + encodeURIComponent(user) : "/api/v1/rooms";
    const result = await apiRequest<{ rooms: unknown[] }>("GET", route);
    print(result.rooms, boolOption(options, "json"));
    return;
  }

  if (command === "create") {
    print(await apiRequest("POST", "/api/v1/rooms", {
      name: requireOption(options, "name"),
      instanceId: option(options, "instanceId"),
      userEmail: option(options, "user")
    }), boolOption(options, "json"));
    return;
  }

  const roomId = requireOption(options, "roomId");
  if (command === "rename" || command === "update") {
    await apiRequest("PATCH", "/api/v1/rooms/" + roomId, { name: requireOption(options, "name") });
    console.log("Room updated");
    return;
  }

  if (command === "delete") {
    await apiRequest("DELETE", "/api/v1/rooms/" + roomId);
    console.log("Room deleted");
    return;
  }

  if (command === "metrics") {
    print(await apiRequest("GET", "/api/v1/rooms/" + roomId + "/metrics/current"), boolOption(options, "json"));
    return;
  }

  if (command === "devices") {
    print(await apiRequest("GET", "/api/v1/rooms/" + roomId + "/devices"), boolOption(options, "json"));
    return;
  }

  throw new Error("Unknown rooms command");
}

async function emulators(command: string, options: Options): Promise<void> {
  if (["list", "free", "assigned"].includes(command)) {
    const suffix = command === "list" ? "" : "/" + command;
    const result = await apiRequest<{ emulators: unknown[] }>("GET", "/api/v1/emulators" + suffix);
    print(result.emulators, boolOption(options, "json"));
    return;
  }

  if (command === "get") {
    print(await apiRequest("GET", "/api/v1/emulators/" + requireOption(options, "id")), boolOption(options, "json"));
    return;
  }

  if (command === "assign") {
    print(await apiRequest("POST", "/api/v1/emulators/" + requireOption(options, "emulator") + "/assign", { roomId: requireOption(options, "roomId") }), boolOption(options, "json"));
    return;
  }

  if (command === "release") {
    await apiRequest("POST", "/api/v1/emulators/" + requireOption(options, "emulator") + "/release", {});
    console.log("Emulator released");
    return;
  }

  const emulatorId = requireOption(options, "emulator");
  if (command === "scenario") {
    await publishMqtt("safeair/" + emulatorId + "/scenario", envelope("safeairctl", { scenario: requireOption(options, "scenario") }));
    return;
  }

  const actionMap: Record<string, string> = {
    "set-temp": "set_temperature",
    "set-humidity": "set_humidity",
    "set-co2": "set_co2",
    "set-pm25": "set_pm25",
    pause: "pause",
    resume: "resume"
  };
  const action = actionMap[command];
  if (action) {
    const value = option(options, "value");
    await publishMqtt("safeair/" + emulatorId + "/commands", envelope("safeairctl", { action, value: value === undefined ? undefined : Number(value) }));
    return;
  }

  throw new Error("Unknown emulators command");
}

async function actuators(command: string, options: Options): Promise<void> {
  const actionMap: Record<string, { action: string; value?: boolean }> = {
    on: { action: "turn_on", value: true },
    off: { action: "turn_off", value: false },
    "set-temp": { action: "set_temperature" }
  };
  const mapped = actionMap[command];
  if (!mapped) {
    throw new Error("Unknown actuators command");
  }

  print(await apiRequest("POST", "/api/v1/rooms/" + requireOption(options, "roomId") + "/actuators/" + requireOption(options, "device") + "/command", {
    deviceIndex: Number(option(options, "index") ?? 1),
    action: mapped.action,
    value: mapped.value ?? Number(requireOption(options, "value")),
    source: "safeairctl"
  }), boolOption(options, "json"));
}

async function logs(command: string, options: Options): Promise<void> {
  if (command === "tail") {
    const intervalMs = Number(option(options, "interval") ?? DEFAULT_LOG_INTERVAL_MS);
    for (;;) {
      const result = await apiRequest<JsonValue>("GET", "/api/v1/logs?limit=" + encodeURIComponent(option(options, "limit") ?? DEFAULT_LOG_LIMIT));
      console.clear();
      print((result as { logs?: unknown[] }).logs ?? result, boolOption(options, "json"));
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  let route = "";
  if (command === "api") route = "/api/v1/logs?type=api";
  else if (command === "emulators") route = "/api/v1/logs?type=emulator";
  else if (command === "room") route = "/api/v1/logs?roomId=" + encodeURIComponent(requireOption(options, "roomId"));
  else if (command === "emulator") route = "/api/v1/logs?emulator=" + encodeURIComponent(requireOption(options, "emulator"));
  else throw new Error("Unknown logs command");

  const result = await apiRequest<{ logs: unknown[] }>("GET", route);
  print(result.logs, boolOption(options, "json"));
}

function requireOption(options: Options, name: string): string {
  const value = option(options, name);
  if (!value) {
    throw new Error("--" + name + " is required");
  }
  return value;
}

function usage(): void {
  console.log(`safeairctl

Auth:
  npm run cli -- login --email admin@safeair.local
  npm run cli -- whoami
  npm run cli -- logout

Groups:
  users, rooms, emulators, actuators, logs

Environment:
  SAFEAIR_API_URL=${getDefaultApiUrl()}
  SAFEAIR_MQTT_URL=${getDefaultMqttUrl()}
  SAFEAIR_TOKEN=<token>`);
}

async function main(): Promise<void> {
  const { positional, options } = parseOptions(process.argv.slice(2));
  const [group, command] = positional;

  if (!group || group === "help" || boolOption(options, "help")) {
    usage();
    return;
  }

  if (!command && !["whoami", "logout"].includes(group)) {
    throw new Error("Missing command. Run npm run cli -- help");
  }
  const action = command ?? "";

  if (["login", "whoami", "logout"].includes(group)) {
    await auth(group, options);
    return;
  }

  if (group === "users") await users(action, options);
  else if (group === "rooms") await rooms(action, options);
  else if (group === "emulators") await emulators(action, options);
  else if (group === "actuators") await actuators(action, options);
  else if (group === "logs") await logs(action, options);
  else throw new Error("Unknown group: " + group);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
