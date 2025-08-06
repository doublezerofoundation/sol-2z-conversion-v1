#[allow(deprecated)]
use anchor_client::{anchor_lang::prelude::Pubkey, solana_sdk::bpf_loader_upgradeable};
use crate::seeds::{
    CONFIGURATION_REGISTRY_SEEDS,
    DENY_LIST_REGISTRY_SEEDS,
    FILLS_REGISTRY_SEEDS,
    PROGRAM_STATE_SEEDS
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

// Commented due to backwards compatibility with anchor 0.30.1
// TODO: Uncomment when upgrading to anchor 0.31.1
// /// Get the program data account PDA for a program using the v3 loader
// pub fn get_program_data_account_pda(program_id: Pubkey) -> Pubkey {
//     solana_loader_v3_interface::get_program_data_address(&program_id)
// }