use crate::seeds::{CONFIGURATION_REGISTRY_SEEDS, DENY_LIST_REGISTRY_SEEDS, FILLS_REGISTRY_SEEDS, MOCK_2Z_TOKEN_MINT_SEED, MOCK_PROTOCOL_TREASURY_SEED, MOCK_VAULT_SEED, PROGRAM_STATE_SEEDS};
use anchor_client::{anchor_lang::prelude::Pubkey, solana_sdk::bpf_loader_upgradeable};

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

pub fn get_fills_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[FILLS_REGISTRY_SEEDS],
        &program_id,
    )
}

pub fn get_deny_list_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[DENY_LIST_REGISTRY_SEEDS],
        &program_id,
    )
}

pub fn get_program_data_account_pda(program_id: Pubkey) -> Pubkey {
    Pubkey::find_program_address(
        &[program_id.as_ref()],
        &bpf_loader_upgradeable::id(),
    )
        .0
}

pub fn get_vault_pda(transfer_program_id: Pubkey) ->  (Pubkey, u8) {
    Pubkey::find_program_address(
        &[MOCK_VAULT_SEED],
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