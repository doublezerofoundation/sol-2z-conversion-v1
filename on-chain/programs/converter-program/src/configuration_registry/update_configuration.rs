use anchor_lang::prelude::*;
use crate::{
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry,
    state::program_state::ProgramStateAccount,
    common::{
        error::DoubleZeroError,
        seeds::seed_prefixes::SeedPrefixes
    },
    AccountInfo
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ConfigurationRegistryInput {
    pub oracle_pubkey: Option<Pubkey>,
    pub sol_quantity: Option<u64>,
    pub slot_threshold: Option<u64>,
    pub price_maximum_age: Option<i64>, //in seconds
    pub max_fills_storage: Option<u64>,
}

#[derive(Accounts)]
pub struct ConfigurationRegistryUpdate<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

impl<'info> ConfigurationRegistryUpdate<'info> {
    pub fn process_update(&mut self, input: ConfigurationRegistryInput) -> anchor_lang::Result<()> {
        // Authentication and authorization
        if self.program_state.admin != self.authority.key() {
            return err!(DoubleZeroError::UnauthorizedUser);
        }
        if self.deny_list_registry.denied_addresses.contains(self.authority.key) {
            return err!(DoubleZeroError::UserInsideDenyList);
        }

        self.configuration_registry.update(input)
    }
}
