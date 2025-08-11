import path from "path";
import { SystemConfig } from "../account-defs";
import fs from "fs";

export const getConfig = (): SystemConfig => {
    const configFile = path.join(__dirname, "..", "..", "cli", "config.json");
    const config = fs.readFileSync(configFile, "utf8");
    return JSON.parse(config);
}

export const updateConfig = (config: SystemConfig) => {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...config };
    const configFile = path.join(__dirname, "..", "..", "cli", "config.json");
    fs.writeFileSync(configFile, JSON.stringify(updatedConfig, null, 2));
}