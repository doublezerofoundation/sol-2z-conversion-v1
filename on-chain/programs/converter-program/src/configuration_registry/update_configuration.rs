use anchor_lang::prelude::*;
use crate::{
    configuration_registry::configuration_registry_v2::ConfigurationRegistryV2,
    state::program_state::ProgramStateAccount,
    common::seeds::seed_prefixes::SeedPrefixes,
    AccountInfo
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub price_maximum_age: Option<i64>, //in seconds
    pub coefficient: Option<u64>,
    pub max_discount_rate: Option<u64>,
    pub min_discount_rate: Option<u64>,
}

#[derive(Accounts)]
pub struct ConfigurationRegistryUpdate<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistryV2>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

impl<'info> ConfigurationRegistryUpdate<'info> {
    pub fn process_update(&mut self, input: ConfigurationRegistryInput) -> Result<()> {
        // Authentication and authorization
        self.program_state.assert_admin(&self.admin)?;
        self.configuration_registry.update(input)
    }
}