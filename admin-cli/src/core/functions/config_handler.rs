use std::{error::Error, str::FromStr};

use anchor_client::{
    anchor_lang::{prelude::AccountMeta, AnchorSerialize},
    solana_sdk::{
        hash::hash, instruction::Instruction, pubkey::Pubkey, signer::Signer,
    },
};
use cli_common::{
    structs::ConfigurationRegistry,
    transaction_executor::{get_account_data, send_batch_instructions},
    utils::{pda_helper, ui, env_var::load_payer_from_env},
};
use crate::core::{
    common::{
        instruction::UPDATE_CONFIGURATION_REGISTRY_INSTRUCTION, structs::ConfigurationRegistryInput,
    },
    config::AdminConfig,
};

pub fn view_config() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let config_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let config_registry: ConfigurationRegistry =
        get_account_data(admin_config.rpc_url, config_registry_pda)?;

    println!("{:#?}", config_registry);
    Ok(())
}

pub fn update_config() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let payer = load_payer_from_env()?;

    let mut account_data = hash(UPDATE_CONFIGURATION_REGISTRY_INSTRUCTION).to_bytes()[..8].to_vec();
    let input = ConfigurationRegistryInput {
        oracle_pubkey: Some(admin_config.oracle_pubkey),
        sol_quantity: Some(admin_config.sol_quantity),
        price_maximum_age: Some(admin_config.price_maximum_age),
        coefficient: Some(admin_config.coefficient),
        max_discount_rate: Some(admin_config.max_discount_rate),
        min_discount_rate: Some(admin_config.min_discount_rate),
    };
    account_data = [account_data, input.try_to_vec()?].concat();

    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;

    println!("Configuration Registry PDA: {}", configuration_registry_pda);
    println!("Program State PDA: {}", program_state_pda);

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new_readonly(program_state_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let ix = Instruction {
        program_id,
        accounts,
        data: account_data,
    };

    send_batch_instructions(vec![ix])?;
    println!("{} Configuration registry updated", ui::OK);
    Ok(())
}
