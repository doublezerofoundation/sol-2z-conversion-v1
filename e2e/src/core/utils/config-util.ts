import path from "path";
import { SystemConfig } from "../account-defs";
import fs from "fs";

export interface Config {
    oracle_pubkey: string;
    sol_quantity: number;
    slot_threshold: number;
    max_fills_storage: number;
    max_discount_rate: number;
    min_discount_rate: number;
    coefficient: number;
}

export const getConfig = (): Config => {
    const configFile = path.join(__dirname, "..", "..", "..", "cli", "config.json");
    const config = fs.readFileSync(configFile, "utf8");
    return JSON.parse(config);
}

export const updateConfig = (config: Config) => {
    const currentConfig = getConfig();
    const updatedConfig = { ...currentConfig, ...config };
    const configFile = path.join(__dirname, "..", "..", "..", "cli", "config.json");
    fs.writeFileSync(configFile, JSON.stringify(updatedConfig, null, 2));
}