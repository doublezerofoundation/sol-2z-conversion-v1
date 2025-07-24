use std::env;
use std::error::Error;
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