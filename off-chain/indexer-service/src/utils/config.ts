import path from "path";
import fs from "fs";

export interface Config {
  RPC_URL: string;
  PROGRAM_ID: string;
  CONCURRENCY: number;
}

const ENV = process.env.ENV || "default_env";
const configPath = path.resolve(__dirname, "../../config", `${ENV}.json`);

let config: Config;
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} else {
  // fallback to default.json
  const defaultPath = path.resolve(__dirname, "../../config", "default.json");
  config = JSON.parse(fs.readFileSync(defaultPath, "utf-8"));
}

export { ENV };
export default config;