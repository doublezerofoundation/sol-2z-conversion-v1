use std::{error::Error, str::FromStr};

use anchor_client::{anchor_lang::prelude::AccountMeta, solana_sdk::{hash::hash, instruction::Instruction, pubkey::Pubkey, signer::Signer}};
use cli_common::{transaction_executor::send_batch_instructions, utils::{env_var::load_payer_from_env, pda_helper, ui}};
use crate::core::{common::instruction::SET_ADMIN_INSTRUCTION, config::AdminConfig};

pub fn set_admin(admin: String) -> Result<(), Box<dyn Error>> {
    let payer = load_payer_from_env()?;
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let program_data_pda = pda_helper::get_program_data_account_pda(program_id);
    let admin_pubkey = Pubkey::from_str(&admin)?;

    let mut data = hash(SET_ADMIN_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [
        data,
        admin_pubkey.to_bytes().to_vec(),
    ].concat();

    let accounts = vec![
        AccountMeta::new(payer.pubkey(), true),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new_readonly(program_id, false),
        AccountMeta::new_readonly(program_data_pda, false),
    ];

    let ix = Instruction {
        program_id,
        accounts,
        data,
    };

    send_batch_instructions(vec![ix])?;

    println!("{} Admin set successfully", ui::OK);
    Ok(())
}