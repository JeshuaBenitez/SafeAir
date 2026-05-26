type LogFn = (message: string, payload?: unknown) => void;

const info: LogFn = (message, payload) => {
  if (payload !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, payload);
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`[INFO] ${message}`);
};

const error: LogFn = (message, payload) => {
  if (payload !== undefined) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, payload);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[ERROR] ${message}`);
};

const warn: LogFn = (message, payload) => {
  if (payload !== undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, payload);
    return;
  }

  // eslint-disable-next-line no-console
  console.warn(`[WARN] ${message}`);
};

const debug: LogFn = (message, payload) => {
  if (payload !== undefined) {
    // eslint-disable-next-line no-console
    console.debug(`[DEBUG] ${message}`, payload);
    return;
  }

  // eslint-disable-next-line no-console
  console.debug(`[DEBUG] ${message}`);
};

export const logger = {
  info,
  error,
  debug,
  warn
};
