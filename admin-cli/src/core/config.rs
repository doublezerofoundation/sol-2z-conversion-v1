use std::error::Error;
use std::str::FromStr;
use anchor_client::anchor_lang::prelude::Pubkey;
use cli_common::config::Config;
pub struct AdminConfig {
    pub rpc_url: String,
    pub program_id: String,
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: i64,
    pub max_fills_storage: u64,
    pub skip_preflight: bool,
}

impl AdminConfig {
    pub fn load_admin_config() -> Result<Self, Box<dyn Error>> {
        let raw_config = Config::load()?;
        let raw_pub_key = raw_config.oracle_pubkey.ok_or("Missing oracle_pubkey")?;
        Ok(AdminConfig {
            rpc_url: raw_config.rpc_url,
            program_id: raw_config.program_id,
            oracle_pubkey:  Pubkey::from_str(&raw_pub_key)?,
            sol_quantity: raw_config.sol_quantity.ok_or("Missing sol_quantity")?,
            slot_threshold: raw_config.slot_threshold.ok_or("Missing slot_threshold")?,
            price_maximum_age: raw_config.price_maximum_age.ok_or("Missing price_maximum_age")?,
            max_fills_storage: raw_config.max_fills_storage.ok_or("Missing max_fills_storage")?,
            skip_preflight : raw_config.skip_preflight,
        })
    }
}