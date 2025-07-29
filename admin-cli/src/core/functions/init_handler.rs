use std::{error::Error, str::FromStr};

use anchor_client::solana_sdk::{
    hash::hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_program,
};

use cli_common::{
    utils::ui,
    transaction_executor,
    utils::{env_var::load_private_key, pda_helper},
};

use crate::core::{
    common::instruction::INITIALIZE_SYSTEM_INSTRUCTION,
    config::AdminConfig,
};

pub fn init() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let private_key = load_private_key()?;
    let payer = Keypair::from_bytes(&private_key)?;

    // Building instruction data
    let mut data_initialize = hash(INITIALIZE_SYSTEM_INSTRUCTION).to_bytes()[..8].to_vec();
    data_initialize = [
        data_initialize,
        admin_config.oracle_pubkey.as_bytes().to_vec(),
        admin_config.sol_quantity.to_le_bytes().to_vec(),
        admin_config.slot_threshold.to_le_bytes().to_vec(),
        admin_config.price_maximum_age.to_le_bytes().to_vec(),
        admin_config.max_fills_storage.to_le_bytes().to_vec(),
        (admin_config.skip_preflight as u8).to_le_bytes().to_vec(),
    ].concat();


    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let fills_registry_pda = pda_helper::get_fills_registry_pda(program_id).0;
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;
    let program_data_account_pda = pda_helper::get_program_data_account_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(fills_registry_pda, false),
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(program_id, false),
        AccountMeta::new(program_data_account_pda, false),
        AccountMeta::new(system_program::ID, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let initialization_ix = Instruction {
        program_id,
        data: data_initialize,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![initialization_ix])?;
    println!("{} System has been successfully initialized", ui::OK);
    Ok(())
}