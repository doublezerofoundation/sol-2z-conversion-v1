use std::{error::Error, str::FromStr};

use anchor_client::solana_sdk::{
    hash::hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::Signer,
};

use cli_common::{
    utils::ui,
    transaction_executor,
    utils::{env_var::load_payer_from_env, pda_helper},
};
use crate::core::{
    common::instruction::SET_FILLS_CONSUMER_INSTRUCTION,
    config::AdminConfig,
};
    

pub fn change_fills_consumer(fills_consumer: &str) -> Result<(), Box<dyn Error>> {
    let admin_config: AdminConfig = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let payer = load_payer_from_env()?;
    let fills_consumer_pub_key = Pubkey::from_str(fills_consumer)?;

    // Building instruction data
    let mut data = hash(SET_FILLS_CONSUMER_INSTRUCTION).to_bytes()[..8].to_vec();
    data.extend_from_slice(fills_consumer_pub_key.as_ref());
    
    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;

    println!("Configuration registry PDA: {}", configuration_registry_pda);
    println!("Program state PDA: {}", program_state_pda);

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let change_fills_consumer_ix = Instruction {
        program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![change_fills_consumer_ix])?;
    println!("{} Fills consumer has been successfully changed", ui::OK);
    Ok(())
}