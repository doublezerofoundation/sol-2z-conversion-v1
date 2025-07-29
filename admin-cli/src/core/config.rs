use std::{error::Error, fs, path::Path};
use cli_common::{config::ConfigLoader, constant::ADMIN_CONFIG_FILE_PATH};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct RawAdminConfig {
    pub rpc_url: String,
    pub program_id: String,
    pub oracle_pubkey: Option<String>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<u64>,
    pub max_fills_storage: Option<u64>,
}

pub struct AdminConfig {
    pub program_id: String,
    pub rpc_url: String,
    pub oracle_pubkey: String,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: u64,
    pub max_fills_storage: u64,
}

impl ConfigLoader for RawAdminConfig {
    fn load() -> Result<Self, Box<dyn Error>> {
        let config_path = ADMIN_CONFIG_FILE_PATH;
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

impl AdminConfig {
    pub fn load_admin_config() -> Result<Self, Box<dyn Error>> {
        let raw_config = RawAdminConfig::load()?;
        Ok(AdminConfig {
            program_id: raw_config.program_id,
            rpc_url: raw_config.rpc_url,
            oracle_pubkey: raw_config.oracle_pubkey.ok_or("Missing oracle_pubkey")?,
            sol_quantity: raw_config.sol_quantity.ok_or("Missing sol_quantity")?,
            slot_threshold: raw_config.slot_threshold.ok_or("Missing slot_threshold")?,
            price_maximum_age: raw_config.price_maximum_age.ok_or("Missing price_maximum_age")?,
            max_fills_storage: raw_config.max_fills_storage.ok_or("Missing max_fills_storage")?,
        })
    }
}
