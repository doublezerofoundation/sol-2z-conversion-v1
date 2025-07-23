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
}

impl Config {
    pub fn load() -> Result<Self, Box<dyn Error>> {
        let config_path = CONFIG_FILE_PATH;
        if Path::new(config_path).exists() {
            match fs::read_to_string(config_path) {
                Ok(contents) => {
                    match serde_json::from_str(&contents) {
                        Ok(config) => Ok(config),
                        Err(_) => Err(Box::from("Error Deserializing the config file"))
                    }
                }
                Err(_) => Err(Box::from("Error Reading file"))
            }
        } else {
            Err(Box::from("Config file not found"))
        }
    }
}
