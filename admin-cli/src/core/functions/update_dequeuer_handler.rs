use std::{error::Error, str::FromStr};

use anchor_client::solana_sdk::{
    hash::hash,
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};

use cli_common::{
    utils::ui,
    transaction_executor,
    utils::{env_var::load_private_key, pda_helper},
};

use crate::core::{
    common::instruction::{ADD_DEQUEUER_INSTRUCTION, REMOVE_DEQUEUER_INSTRUCTION},
    config::AdminConfig,
};
    

pub fn add_dequeuer(dequeuer: &str) -> Result<(), Box<dyn Error>> {
    let admin_config: AdminConfig = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let private_key = load_private_key()?;
    let payer = Keypair::try_from(&private_key as &[u8])?;
    let dequeuer_pk = Pubkey::from_str(dequeuer)?;

    // Building instruction data
    let mut data_initialize = hash(ADD_DEQUEUER_INSTRUCTION).to_bytes()[..8].to_vec();
    data_initialize.extend_from_slice(dequeuer_pk.as_ref());


    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let add_dequeuer_ix = Instruction {
        program_id,
        data: data_initialize,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![add_dequeuer_ix])?;
    println!("{} Dequeuer has been successfully added", ui::OK);


    Ok(())
}

pub fn remove_dequeuer(dequeuer: &str) -> Result<(), Box<dyn Error>> {
    let admin_config: AdminConfig = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let private_key = load_private_key()?;
    let payer = Keypair::try_from(&private_key as &[u8])?;
    let dequeuer_pk = Pubkey::from_str(dequeuer)?;

    // Building instruction data
    let mut data_initialize = hash(REMOVE_DEQUEUER_INSTRUCTION).to_bytes()[..8].to_vec();
    data_initialize.extend_from_slice(dequeuer_pk.as_ref());


    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let add_dequeuer_ix = Instruction {
        program_id,
        data: data_initialize,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![add_dequeuer_ix])?;
    println!("{} Dequeuer has been successfully added", ui::OK);
    Ok(())
}

