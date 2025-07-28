use std::env;
use std::error::Error;
use anchor_client::solana_client::client_error::reqwest::Url;
use anchor_client::Cluster;

use crate::config::Config;
use crate::constant::PRIVATE_KEY_ENV_VAR;

/// Loads the private key from the environment variable as a vector of bytes.
pub fn load_private_key() -> Result<Vec<u8>, Box<dyn Error>> {
    // Read the environment variable
    let private_key_str = env::var(PRIVATE_KEY_ENV_VAR)
        .map_err(|e| format!("Failed to read {}: {}", PRIVATE_KEY_ENV_VAR, e))?;

    // Parse the string into a Vec<u8>
    let private_key: Result<Vec<u8>, _> = private_key_str
        .split(',')
        .map(|s| {
            s.trim().parse::<u8>().map_err(|e| {
                format!(
                    "Failed to parse byte '{}' in {}: {}",
                    s, PRIVATE_KEY_ENV_VAR, e
                )
            })
        })
        .collect();

    // Convert Result<Vec<u8>, String> to Result<Vec<u8>, Box<dyn Error>>
    private_key.map_err(|e| e.into())
}

/// Get the current cluster type through the config.
pub fn get_cluster_type() -> Result<Cluster, Box<dyn Error>> {
    let raw_config = Config::load()?;

    if let Ok(url) = Url::parse(&raw_config.rpc_url) {
        let host = url.host_str().unwrap_or_default();
        let port = url.port_or_known_default();

        match (host, port) {
            ("127.0.0.1", Some(8899)) | ("localhost", Some(8899)) => Ok(Cluster::Localnet),
            _ if host.contains("devnet") => Ok(Cluster::Devnet),
            _ if host.contains("testnet") => Ok(Cluster::Testnet),
            _ if host.contains("mainnet") || host.contains("mainnet-beta") => Ok(Cluster::Mainnet),
            _ => Err("Unknown rpc url".into()),
        }
    } else {
        Err("Unknown rpc url".into())
    }
}