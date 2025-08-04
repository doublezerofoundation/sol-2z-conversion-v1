use std::{
    env,
    error::Error
};
use anchor_client::solana_sdk::signature::Keypair;
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

pub fn load_payer_from_env() -> Result<Keypair, Box<dyn Error>> {
    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;
    // above line is deprecated from solana 2.2.0. below line is the fix. skipping this for older version compatibility
    // let payer = Keypair::try_from(&private_key[..])?;
    Ok(payer)
}