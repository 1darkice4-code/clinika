type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function maskValue(value: string): string {
  if (value.includes("@")) {
    const [name, domain] = value.split("@");
    return `${name.slice(0, 2)}***@${domain}`;
  }

  return value.replace(/(\+?\d{1,3})?\d{4,}(\d{2})/g, "$1***$2");
}

function sanitizeMeta(meta: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (typeof value === "string" && /(phone|email|token|password|cookie)/i.test(key)) {
        return [key, maskValue(value)];
      }
      return [key, value];
    })
  );
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const configuredLevel = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  if (levelWeight[level] < levelWeight[configuredLevel]) return;

  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...sanitizeMeta(meta)
  };

  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
