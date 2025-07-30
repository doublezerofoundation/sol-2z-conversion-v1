use std::{error::Error, str::FromStr};

use anchor_client::{
    anchor_lang::{prelude::AccountMeta, AnchorSerialize},
    solana_sdk::{
        hash::hash, instruction::Instruction, pubkey::Pubkey, signature::Keypair, signer::Signer,
    },
};
use cli_common::{
    transaction_executor::{get_account_data, send_batch_instructions},
    utils::{env_var::load_private_key, pda_helper, ui},
};

use crate::core::{
    common::{
        instruction::UPDATE_CONFIGURATION_REGISTRY_INSTRUCTION,
        structs::{ConfigurationRegistry, ConfigurationRegistryInput},
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

    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;

    let mut account_data = hash(UPDATE_CONFIGURATION_REGISTRY_INSTRUCTION).to_bytes()[..8].to_vec();
    let input = ConfigurationRegistryInput {
        oracle_pubkey: Some(Pubkey::from_str(admin_config.oracle_pubkey.as_str())?),
        sol_quantity: Some(admin_config.sol_quantity),
        slot_threshold: Some(admin_config.slot_threshold),
        price_maximum_age: Some(admin_config.price_maximum_age),
        max_fills_storage: Some(admin_config.max_fills_storage),
    };
    account_data = [account_data, input.try_to_vec()?].concat();

    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new_readonly(program_state_pda, false),
        AccountMeta::new_readonly(deny_list_registry_pda, false),
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
