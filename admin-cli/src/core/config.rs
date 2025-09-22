use std::{
    error::Error,
    str::FromStr
};
use anchor_client::anchor_lang::prelude::Pubkey;
use cli_common::config::Config;
pub struct AdminConfig {
    pub rpc_url: String,
    pub program_id: String,
    pub double_zero_program_id: Pubkey,
    pub oracle_pubkey: Pubkey,
    pub sol_quantity: u64,
    pub price_maximum_age: i64,
    pub coefficient: u64,
    pub max_discount_rate: u64,
    pub min_discount_rate: u64,
}

impl AdminConfig {
    pub fn load_admin_config() -> Result<Self, Box<dyn Error>> {
        let raw_config = Config::load()?;
        let raw_pub_key = raw_config.oracle_pubkey.ok_or("Missing oracle_pubkey in config file")?;
        Ok(AdminConfig {
            rpc_url: raw_config.rpc_url,
            program_id: raw_config.program_id,
            double_zero_program_id: Pubkey::from_str(&raw_config.double_zero_program_id)?,
            oracle_pubkey:  Pubkey::from_str(&raw_pub_key)?,
            sol_quantity: raw_config.sol_quantity.ok_or("Missing sol_quantity in config file")?,
            price_maximum_age: raw_config.price_maximum_age.ok_or("Missing price_maximum_age in config file")?,
            coefficient: raw_config.coefficient.ok_or("Missing coefficient in config file")?,
            max_discount_rate: raw_config.max_discount_rate.ok_or("Missing max_discount_rate in config file")?,
            min_discount_rate: raw_config.min_discount_rate.ok_or("Missing min_discount_rate in config file")?,
        })
    }
}