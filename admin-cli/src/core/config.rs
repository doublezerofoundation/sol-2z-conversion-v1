use std::error::Error;
use cli_common::config::Config;
pub struct AdminConfig {
    pub program_id: String,
    pub oracle_pubkey: String,
    pub sol_quantity: u64,
    pub slot_threshold: u64,
    pub price_maximum_age: u64,
    pub max_fills_storage: u64,
    pub skip_preflight: bool,
}

impl AdminConfig {
     pub fn load_admin_config() -> Result<Self, Box<dyn Error>> {
          let raw_config = Config::load()?;

          Ok(AdminConfig {
               program_id: raw_config.program_id,
               oracle_pubkey: raw_config.oracle_pubkey.ok_or("Missing oracle_pubkey")?,
               sol_quantity: raw_config.sol_quantity.ok_or("Missing sol_quantity")?,
               slot_threshold: raw_config.slot_threshold.ok_or("Missing slot_threshold")?,
               price_maximum_age: raw_config.price_maximum_age.ok_or("Missing price_maximum_age")?,
               max_fills_storage: raw_config.max_fills_storage.ok_or("Missing max_fills_storage")?,
               skip_preflight : raw_config.skip_preflight,
          })
     }
}