use std::error::Error;
use anchor_client::anchor_lang::prelude::Pubkey;
use crate::{
    structs::ProgramStateAccount,
    seeds::{
        CONFIGURATION_REGISTRY_SEEDS, DENY_LIST_REGISTRY_SEEDS,
        MOCK_2Z_TOKEN_MINT_SEED, MOCK_PROTOCOL_TREASURY_SEED,
        MOCK_VAULT_SEED, PROGRAM_STATE_SEEDS, MOCK_CONFIG_ACCOUNT,
        MOCK_REVENUE_DISTRIBUTION_JOURNAL, WITHDRAW_AUTHORITY_SEEDS
    },
    transaction_executor::get_account_data,
};

pub fn get_configuration_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[CONFIGURATION_REGISTRY_SEEDS],
        &program_id,
    )
}
pub fn get_program_state_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[PROGRAM_STATE_SEEDS],
        &program_id,
    )
}

pub fn get_fills_registry_address(program_id: Pubkey, rpc_url: String) -> Result<Pubkey, Box<dyn Error>> {
    let program_state_address = get_program_state_pda(program_id).0;
    let program_state_account: ProgramStateAccount = get_account_data(rpc_url, program_state_address)?;
    Ok(program_state_account.fills_registry_address)
}

pub fn get_deny_list_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[DENY_LIST_REGISTRY_SEEDS],
        &program_id,
    )
}

pub fn get_withdraw_authority_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[WITHDRAW_AUTHORITY_SEEDS],
        &program_id,
    )
}
/// Get the program data account PDA for a program using the v3 loader.
pub fn get_program_data_account_pda(program_id: Pubkey) -> Pubkey {
    solana_loader_v3_interface::get_program_data_address(&program_id)
}

pub fn get_vault_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_VAULT_SEED],
        &transfer_program_id,
    )
}

pub fn get_config_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_CONFIG_ACCOUNT],
        &transfer_program_id,
    )
}

pub fn get_journal_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_REVENUE_DISTRIBUTION_JOURNAL],
        &transfer_program_id,
    )
}

pub fn get_token_mint_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_2Z_TOKEN_MINT_SEED],
        &transfer_program_id,
    )
}

pub fn get_protocol_treasury_token_account_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_PROTOCOL_TREASURY_SEED],
        &transfer_program_id,
    )
}