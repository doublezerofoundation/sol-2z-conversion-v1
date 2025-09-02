import path from "path";
import fs from "fs";
import { LogLevel } from "./logger";

export interface Config {
  applicationPort: number;
  RPC_URL: string;
  PROGRAM_ID: string;
  CONCURRENCY: number;
  LOG_LEVEL: string;
}

const ENV = process.env.ENVIRONMENT || "default_env";
const configPath = path.resolve(__dirname, "../../config", `${ENV}.json`);

let config: Config;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} else {
  // fallback to default.json
  const defaultPath = path.resolve(__dirname, "../../config", "default.json");
  config = JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
}

// Convert string log level to LogLevel enum
export function getLogLevel(): LogLevel {
  const logLevelStr = config.LOG_LEVEL || 'INFO';
  switch (logLevelStr.toUpperCase()) {
    case 'ERROR': return LogLevel.ERROR;
    case 'WARN': return LogLevel.WARN;
    case 'INFO': return LogLevel.INFO;
    case 'DEBUG': return LogLevel.DEBUG;
    default: return LogLevel.INFO;
  }
}

export { ENV };
export default config;