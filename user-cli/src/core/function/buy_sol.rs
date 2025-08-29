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
        prelude::{AccountMeta, Pubkey},
    }
};
use cli_common::{
    transaction_executor,
    utils::{
        env_var::load_payer_from_env,
        pda_helper,
        fixed_point_utils::parse_token_value,
        token_utils::find_or_initialize_associated_token_account,
        ui::{BULLET, LABEL}
    },
};
// Internal modules
use crate::core::{
    common::instruction::BUY_SOL_INSTRUCTION,
    config::UserConfig,
    utils::price_utils::fetch_oracle_price,
};

pub async fn buy_sol(bid_price: String, from_address: Option<String>) -> Result<(), Box<dyn Error>> {
    let user_config = UserConfig::load_user_config()?;
    let program_id = Pubkey::from_str(&user_config.program_id)?;
    let revenue_distribution_program = Pubkey::from_str(&user_config.double_zero_program_id)?;

    let bid_price_parsed = parse_token_value(&bid_price)?;
    let payer = load_payer_from_env()?;
    let payer_pub_key = payer.pubkey();
    let token_mint_account_pda = pda_helper::get_token_mint_pda(revenue_distribution_program).0;

    let from_pub_key = match from_address {
        Some(ref key_str) => Pubkey::from_str(key_str)?,
        None => find_or_initialize_associated_token_account(
            payer,
            token_mint_account_pda,
            user_config.rpc_url.clone()
        )?
    };

    let oracle_price_data = fetch_oracle_price(user_config.price_oracle_end_point).await?;
    let mut data = hash(BUY_SOL_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [data, bid_price_parsed.to_le_bytes().to_vec(), oracle_price_data.try_to_vec()?].concat();

    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;
    let withdraw_authority = pda_helper::get_withdraw_authority_pda(program_id).0;
    let config_pda = pda_helper::get_config_pda(revenue_distribution_program).0;
    let journal_pda = pda_helper::get_journal_pda(revenue_distribution_program).0;
    let protocol_treasury_token_account_pda =
        pda_helper::get_protocol_treasury_token_account_pda(revenue_distribution_program).0;
    let fills_registry = pda_helper::get_fills_registry_address(program_id, user_config.rpc_url)?;

    println!("{LABEL} Fills registry address: {}", fills_registry);
    println!("{LABEL} Configuration registry PDA: {}", configuration_registry_pda);
    println!("{LABEL} Program state PDA: {}", program_state_pda);
    println!("{LABEL} Deny list registry PDA: {}", deny_list_registry_pda);
    println!("{LABEL} Withdraw authority PDA: {}", withdraw_authority);
    println!("{LABEL} Journal account: {}", journal_pda);
    println!("{LABEL} Protocol treasury PDA: {}", protocol_treasury_token_account_pda);
    println!("{LABEL} Mock config account: {}", config_pda);

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(fills_registry, false),
        AccountMeta::new(withdraw_authority, false),
        AccountMeta::new(from_pub_key, false),
        AccountMeta::new(protocol_treasury_token_account_pda, false),
        AccountMeta::new(token_mint_account_pda, false),
        AccountMeta::new(config_pda, false),
        AccountMeta::new(journal_pda, false),
        AccountMeta::new(spl_token_2022::id(), false),
        AccountMeta::new(revenue_distribution_program, false),
        AccountMeta::new(payer_pub_key, true),
    ];

    let buy_sol_ix = Instruction {
        program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![buy_sol_ix])?;

    println!("{BULLET} Buying SOL for {}", bid_price);
    Ok(())
}