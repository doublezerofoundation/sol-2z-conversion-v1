use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::Path,
    error::Error
};
use crate::constant::CONFIG_FILE_PATH;

#[derive(Serialize, Deserialize, Debug)]
pub struct Config {
    // Common Configs
    pub rpc_url: String,
    pub program_id: String,
    pub transfer_program_id: String,
    pub oracle_pubkey: Option<String>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<i64>,
    pub max_fills_storage: Option<u64>,
    pub skip_preflight: bool,
    pub price_oracle_end_point: Option<String>,
    pub steepness: Option<u64>,
    pub max_discount_rate: Option<u64>,
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn Error>> {
        let config_path = CONFIG_FILE_PATH;
        if Path::new(config_path).exists() {
            match fs::read_to_string(config_path) {
                Ok(contents) => {
                    match serde_json::from_str(&contents) {
                        Ok(config) => Ok(config),
                        Err(e) => Err(Box::from(format!("Error deserializing the config file: {}", e))),
                    }
                }
                Err(_) => Err(Box::from("Error Reading file"))
            }
        } else {
            Err(Box::from("Config file not found"))
        }
    }
}
