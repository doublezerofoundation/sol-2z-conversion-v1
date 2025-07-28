use std::{error::Error, str::FromStr};

use anchor_client::solana_sdk::pubkey::Pubkey;
use cli_common::{transaction_executor::get_account_data, utils::pda_helper};

use converter_program::configuration_registry::configuration_registry::ConfigurationRegistry;

use crate::core::config::AdminConfig;

pub fn view_config() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let config_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let config_registry: ConfigurationRegistry = get_account_data(config_registry_pda)?;

    println!("{:#?}", config_registry);
    Ok(())
}

pub fn update_config() -> Result<(), Box<dyn Error>> {
    println!("Update Configs");
    Ok(())
}