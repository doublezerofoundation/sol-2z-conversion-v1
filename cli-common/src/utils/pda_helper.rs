use anchor_client::anchor_lang::prelude::Pubkey;
use anchor_client::solana_sdk::bpf_loader_upgradeable;
use shared::seeds::seed_prefixes::SeedPrefixes;

pub fn get_configuration_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SeedPrefixes::ConfigurationRegistry.as_bytes()],
        &program_id,
    )
}
pub fn get_program_state_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SeedPrefixes::ProgramState.as_bytes()],
        &program_id,
    )
}

pub fn get_fills_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SeedPrefixes::FillsRegistry.as_bytes()],
        &program_id,
    )
}

pub fn get_deny_list_registry_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[SeedPrefixes::DenyListRegistry.as_bytes()],
        &program_id,
    )
}

pub fn get_program_data_account_pda(program_id: Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[&program_id.as_ref()],
        &bpf_loader_upgradeable::ID,
    )
}