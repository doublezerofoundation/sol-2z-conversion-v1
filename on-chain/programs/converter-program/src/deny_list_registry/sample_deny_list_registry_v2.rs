use crate::{
    state::program_state::ProgramStateAccount,
    common::{
        constant::MAX_DENY_LIST_SIZE,
        seeds::seed_prefixes::SeedPrefixes,
        // error::DoubleZeroError,
    }
};
use anchor_lang::prelude::*;

// Sample struct. to test upgrades
#[account]
#[derive(InitSpace, Debug)]
pub struct DenyListRegistryV2 {
    #[max_len(MAX_DENY_LIST_SIZE)]
    pub denied_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub update_count: u64, // For audit purposes
    pub new_field: u64,
}

#[derive(Accounts)]
pub struct UpdateDenyList<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump = program_state.bump_registry.deny_list_registry_bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistryV2>,
    // Program state, to verify admin
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

// Methods has to be implemented