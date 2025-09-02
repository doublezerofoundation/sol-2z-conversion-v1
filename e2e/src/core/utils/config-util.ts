import path from "path";
import { SystemConfig } from "../account-defs";
import fs from "fs";

export interface Config {
    rpc_url: string;
    double_zero_program_id: string;
    oracle_pubkey: string;
    sol_quantity: number;
    max_discount_rate: number;
    min_discount_rate: number;
    coefficient: number;
    price_maximum_age: number;
    price_oracle_end_point: string;
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