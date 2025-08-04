use std::{
    error::Error,
    str::FromStr
};
use anchor_client::{
    solana_sdk::{
        hash::hash,
        instruction::Instruction,
        signature::{ Signer }
    },
    anchor_lang::{
        AnchorSerialize,
        prelude::{AccountMeta, Pubkey}
    }
};
use rust_decimal::{
    Decimal,
    prelude::ToPrimitive
};
use cli_common::{
    constant::TOKEN_DECIMALS,
    transaction_executor,
    utils::{env_var::load_payer_from_env, pda_helper},
};

// Internal modules
use crate::core::{
    common::instruction::BUY_SOL_INSTRUCTION,
    config::UserConfig,
    utils::price_utils::fetch_oracle_price,
};

pub async fn buy_sol(bid_price: String) -> Result<(), Box<dyn Error>> {
    let user_config = UserConfig::load_user_config()?;
    let token_decimals = Decimal::from(TOKEN_DECIMALS);
    let program_id = Pubkey::from_str(&user_config.program_id)?;

    let amount_input = Decimal::from_str(&bid_price)?;
    let bid_price_parsed = (amount_input * token_decimals).to_u64()
        .expect("Deposit amount Overflow or conversion failed");

    let payer = load_payer_from_env()?;
    let oracle_price_data = fetch_oracle_price(user_config.price_oracle_end_point).await?;
    let mut data = hash(BUY_SOL_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [
        data,
        bid_price_parsed.to_le_bytes().to_vec(),
        oracle_price_data.swap_rate.try_to_vec().expect("Error in serializing Swap Rate"),
        oracle_price_data.timestamp.to_le_bytes().to_vec(),
        oracle_price_data.signature.try_to_vec().expect("Error in serializing attestation"),
    ].concat();

    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;
    let fills_registry_pda = pda_helper::get_fills_registry_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(fills_registry_pda, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let buy_sol_ix = Instruction {
        program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![buy_sol_ix])?;

    println!("Buying SOL for {}", bid_price);
    Ok(())
}