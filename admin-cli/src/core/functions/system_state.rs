use anchor_client::{
    anchor_lang::prelude::AccountMeta,
    solana_sdk::{
        hash::hash, instruction::Instruction, pubkey::Pubkey, signer::Signer,
    },
};
use cli_common::{
    structs::ProgramStateAccount,
    transaction_executor::{get_account_data, send_batch_instructions},
    utils::{env_var::load_payer_from_env, pda_helper, ui},
};
use std::{error::Error, str::FromStr};

use crate::core::{
    common::{error::INVALID_ARGUMENTS, instruction::TOGGLE_SYSTEM_STATE_INSTRUCTION},
    config::AdminConfig,
};

pub fn view_system_state() -> Result<(), Box<dyn Error>> {
    println!("{} View System State", ui::LABEL);

    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let program_state: ProgramStateAccount =
        get_account_data(admin_config.rpc_url, program_state_pda)?;

    println!(
        "{} Current System State: {}",
        ui::OK,
        if program_state.is_halted {
            "⏸ Paused"
        } else {
            "🟢 Active"
        }
    );

    Ok(())
}

pub fn toggle_system_state(activate: bool, pause: bool) -> Result<(), Box<dyn Error>> {
    println!("{} Toggle System State", ui::LABEL);

    let set_to = validate_and_extract_user_input(activate, pause)?;

    let admin = load_payer_from_env()?;

    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;

    println!("Program State PDA: {}", program_state_pda);
    println!("Setting System State (is_halted) to {:?}", set_to);

    let mut data = hash(TOGGLE_SYSTEM_STATE_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [data, vec![set_to as u8]].concat();

    let accounts = vec![
        AccountMeta::new(admin.pubkey(), true),
        AccountMeta::new(program_state_pda, false),
    ];

    let ix = Instruction {
        program_id,
        accounts,
        data,
    };

    send_batch_instructions(vec![ix])?;

    println!(
        "{} System State set to {:?}",
        ui::OK,
        if set_to { "⏸ Paused" } else { "🟢 Active" }
    );
    Ok(())
}

fn validate_and_extract_user_input(activate: bool, pause: bool) -> Result<bool, Box<dyn Error>> {
    // checking whether user has provided both active and pause as input
    if activate && pause {
        return Err(Box::from(INVALID_ARGUMENTS));
    }

    let set_to = if activate {
        Some(false)
    } else if pause {
        Some(true)
    } else {
        None
    };

    match set_to {
        Some(value) => Ok(value),
        None => Err(Box::from(INVALID_ARGUMENTS)),
    }
}
