use std::{error::Error, fs, path::Path};

use cli_common::{config::ConfigLoader, constant::USER_CONFIG_FILE_PATH};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct RawUserConfig {
    pub rpc_url: String,
    pub program_id: String,
    pub oracle_pubkey: Option<String>,
}

impl ConfigLoader for RawUserConfig {
    fn load() -> Result<Self, Box<dyn Error>> {
        let config_path = USER_CONFIG_FILE_PATH;
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

#[allow(dead_code)]
pub struct UserConfig {
    pub rpc_url: String,
    pub program_id: String,
    pub oracle_pubkey: String,
}

#[allow(dead_code)]
impl UserConfig {
    pub fn load_user_config() -> Result<Self, Box<dyn Error>> {
        let raw_config = RawUserConfig::load()?;
        Ok(UserConfig {
            rpc_url: raw_config.rpc_url,
            program_id: raw_config.program_id,
            oracle_pubkey: raw_config.oracle_pubkey.ok_or("Missing oracle_pubkey")?,
        })
    }
}