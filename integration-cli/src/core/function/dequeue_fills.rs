use crate::core::common::{
    instruction::DEQUEUE_FILLS_INSTRUCTION,
    structs::DequeueFillsResult
};
use anchor_client::{
    anchor_lang::prelude::{AccountMeta, Pubkey},
    solana_sdk::{
        hash::hash,
        instruction::Instruction,
        signature::Signer
    }
};
use cli_common::{
    config::Config,
    transaction_executor::send_instruction_with_return_data,
    utils::{
        env_var::load_payer_from_env,
        pda_helper,
        fixed_point_utils::parse_sol_value
    },
};
use std::{
    error::Error,
    str::FromStr
};

pub fn dequeue_fills(max_sol_value: String) -> Result<(), Box<dyn Error>> {
    let config = Config::load()?;
    let program_id = Pubkey::from_str(&config.program_id)?;

    let bid_price_parsed = parse_sol_value(&max_sol_value)?;
    let payer = load_payer_from_env()?;
    let payer_pub_key = payer.pubkey();
    let mut data = hash(DEQUEUE_FILLS_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [data, bid_price_parsed.to_le_bytes().to_vec()].concat();

    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let fills_registry_pda = pda_helper::get_fills_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(fills_registry_pda, false),
        AccountMeta::new(payer_pub_key, true),
    ];

    let dequeue_fills_ix = Instruction {
        program_id,
        data,
        accounts,
    };

    let result_bps: DequeueFillsResult = send_instruction_with_return_data(dequeue_fills_ix)?;

    println!("Dequeue Fills has been sent to on-chain for max_sol_value: {}", max_sol_value);
    println!("{:?}", result_bps);
    Ok(())
}