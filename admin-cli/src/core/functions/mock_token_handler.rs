use std::{error::Error, str::FromStr};

use anchor_client::{
    anchor_lang::system_program,
    solana_client::rpc_client::RpcClient,
    solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signer::Signer,
    },
};
use anchor_client::solana_sdk::sysvar;
use solana_commitment_config::CommitmentConfig;

use cli_common::{
    transaction_executor,
    utils::{
        env_var::load_payer_from_env,
        fixed_point_utils::{parse_sol_value, parse_token_value},
        pda_helper,
        token_utils::find_or_initialize_associated_token_account,
        ui,
    },
};
use crate::core::{
    common::instruction::{MOCK_SYSTEM_INITIALIZE, MOCK_TOKEN_MINT_INSTRUCTION},
    config::AdminConfig,
};

pub fn init() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let mock_program_id = Pubkey::from_str(&admin_config.double_zero_program_id)?;
    let payer = load_payer_from_env()?;

    let token_mint_account_pda = pda_helper::get_token_mint_pda(mock_program_id).0;
    let protocol_treasury_token_account_pda = pda_helper::get_protocol_treasury_token_account_pda(mock_program_id).0;
    let config_account = pda_helper::get_config_pda(mock_program_id).0;
    let journal_account = pda_helper::get_journal_pda(mock_program_id).0;

    println!("{}  Mock 2Z token mint {}", ui::LABEL, token_mint_account_pda);
    println!("{}  Mock protocol treasury token account {}", ui::LABEL, protocol_treasury_token_account_pda);
    println!("{}  Mock config account {}", ui::LABEL, config_account);
    println!("{}  Journal account {}", ui::LABEL, journal_account);

    // Building instruction data
    let data = hash(MOCK_SYSTEM_INITIALIZE).to_bytes()[..8].to_vec();

    // necessary accounts
    let accounts = vec![
        AccountMeta::new(config_account, false),
        AccountMeta::new(journal_account, false),
        AccountMeta::new(token_mint_account_pda, false),
        AccountMeta::new(protocol_treasury_token_account_pda, false),
        AccountMeta::new(spl_token::id(), false),
        AccountMeta::new(sysvar::rent::ID, false),
        AccountMeta::new(system_program::ID, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let mint_ix = Instruction {
        program_id: mock_program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![mint_ix])?;
    println!("{} Mock program init is successful", ui::OK);
    Ok(())
}

// to account is fixed
pub fn mint_to_account(recipient_pub_key: Pubkey, amount: String) -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let mock_program_id = Pubkey::from_str(&admin_config.double_zero_program_id)?;
    let token_mint_account_pda = pda_helper::get_token_mint_pda(mock_program_id).0;

    let amount_parsed = parse_token_value(&amount)?;

    // Building instruction data
    let mut data = hash(MOCK_TOKEN_MINT_INSTRUCTION).to_bytes()[..8].to_vec();
    data = [data, amount_parsed.to_le_bytes().to_vec()].concat();

    // necessary accounts

    let accounts = vec![
        AccountMeta::new(recipient_pub_key, false),
        AccountMeta::new(token_mint_account_pda, false),
        AccountMeta::new(spl_token::id(), false),
    ];

    let mint_ix = Instruction {
        program_id: mock_program_id,
        data,
        accounts,
    };

    transaction_executor::send_batch_instructions(vec![mint_ix])?;
    println!("{} Token mint is successful", ui::OK);
    Ok(())
}

// to account is flexible where if it is not provided, it takes Associated token address.
pub fn mint(to_pub_key: Option<String>, amount: String) -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let mock_program_id = Pubkey::from_str(&admin_config.double_zero_program_id)?;
    let payer = load_payer_from_env()?;
    let token_mint_account_pda = pda_helper::get_token_mint_pda(mock_program_id).0;

    let recipient_pub_key = match to_pub_key {
        Some(ref key_str) => Pubkey::from_str(key_str)?,
        None => find_or_initialize_associated_token_account(
            payer,
            token_mint_account_pda,
            admin_config.rpc_url
        )?
    };
    mint_to_account(recipient_pub_key, amount)
}

pub fn mint_to_protocol_treasury_token_account(amount: String) -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let mock_program_id = Pubkey::from_str(&admin_config.double_zero_program_id)?;
    let protocol_treasury_token_account =
        pda_helper::get_protocol_treasury_token_account_pda(mock_program_id).0;
    println!("{} Mock protocol treasury token account {}", ui::BULLET, protocol_treasury_token_account);
    mint_to_account(protocol_treasury_token_account, amount)
}

pub fn airdrop_journal(amount: String) -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let mock_program_id = Pubkey::from_str(&admin_config.double_zero_program_id)?;
    load_payer_from_env()?;
    let amount_parsed = parse_sol_value(&amount)?;
    let journal_account = pda_helper::get_journal_pda(mock_program_id).0;
    println!("{} Mock journal address: {}", ui::BULLET, journal_account);
    println!("{} Requesting airdrop for amount: {}", ui::WAITING, amount_parsed);

    let client = RpcClient::new_with_commitment(admin_config.rpc_url, CommitmentConfig::confirmed());
    let sig = client.request_airdrop(&journal_account, amount_parsed).expect("Airdrop failed");
    println!("{} Airdrop requested. Signature: {}",ui::OK , sig);
    Ok(())
}