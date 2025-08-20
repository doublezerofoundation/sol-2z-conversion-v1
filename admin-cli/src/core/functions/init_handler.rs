use std::{error::Error, str::FromStr};
use anchor_client::{
    anchor_lang::system_program,
    solana_sdk::{
        hash::hash,
        instruction::{AccountMeta, Instruction},
        pubkey::Pubkey,
        signature::{Signer, Keypair},
        sysvar::rent
    },
    solana_client::rpc_client::RpcClient
};
use cli_common::{
    utils::ui,
    transaction_executor,
    utils::{env_var::load_payer_from_env, pda_helper},
};
use crate::core::{
    common::instruction::INITIALIZE_SYSTEM_INSTRUCTION,
    config::AdminConfig,
};
use solana_commitment_config::CommitmentConfig;
use solana_system_interface::instruction::create_account;

pub fn init() -> Result<(), Box<dyn Error>> {
    let admin_config = AdminConfig::load_admin_config()?;
    let program_id = Pubkey::from_str(&admin_config.program_id)?;

    let payer = load_payer_from_env()?;
    let fills_account = Keypair::new();

    let space = 10_485_760; // max size
    let rpc_client = RpcClient::new_with_commitment(admin_config.rpc_url, CommitmentConfig::confirmed());
    let rent = rpc_client.get_minimum_balance_for_rent_exemption(space)?;

    let create_fills_account_instruction = create_account(
        &payer.pubkey(),      // fee payer
        &fills_account.pubkey(),           // mint address
        rent,                     // rent
        space as u64,             // space
        &program_id, // program id
    );

    // Building instruction data
    let mut data_initialize = hash(INITIALIZE_SYSTEM_INSTRUCTION).to_bytes()[..8].to_vec();
    data_initialize = [
        data_initialize,
        admin_config.oracle_pubkey.to_bytes().to_vec(),
        admin_config.sol_quantity.to_le_bytes().to_vec(),
        admin_config.price_maximum_age.to_le_bytes().to_vec(),
        admin_config.coefficient.to_le_bytes().to_vec(),
        admin_config.max_discount_rate.to_le_bytes().to_vec(),
        admin_config.min_discount_rate.to_le_bytes().to_vec(),
    ].concat();

    // Getting necessary accounts
    let configuration_registry_pda = pda_helper::get_configuration_registry_pda(program_id).0;
    let program_state_pda = pda_helper::get_program_state_pda(program_id).0;
    let deny_list_registry_pda = pda_helper::get_deny_list_registry_pda(program_id).0;
    let program_data_account_pda = pda_helper::get_program_data_account_pda(program_id);
    let withdraw_authority_pda = pda_helper::get_withdraw_authority_pda(program_id).0;

    let accounts = vec![
        AccountMeta::new(configuration_registry_pda, false),
        AccountMeta::new(program_state_pda, false),
        AccountMeta::new(deny_list_registry_pda, false),
        AccountMeta::new(fills_account.pubkey(), false),
        AccountMeta::new(withdraw_authority_pda, false),
        AccountMeta::new(program_id, false),
        AccountMeta::new(program_data_account_pda, false),
        AccountMeta::new_readonly(rent::id(), false),    // rent
        AccountMeta::new(system_program::ID, false),
        AccountMeta::new(payer.pubkey(), true),
    ];

    let initialization_ix = Instruction {
        program_id,
        data: data_initialize,
        accounts,
    };

    transaction_executor::send_batch_instructions_with_signers(
        vec![
            create_fills_account_instruction,
            initialization_ix,
        ],
        &[&fills_account]
    )?;
    println!("Fills Registry Address: {}", fills_account.pubkey());
    println!("Configuration Registry PDA: {}", configuration_registry_pda);
    println!("Program State PDA: {}", program_state_pda);
    println!("Deny List Registry PDA: {}", deny_list_registry_pda);
    println!("Withdraw Authority PDA: {}", withdraw_authority_pda);
    println!("Program Data PDA: {}", program_data_account_pda);
    println!("{} System has been successfully initialized", ui::OK);
    Ok(())
}