use crate::common::seeds::seed_prefixes_v2::SeedPrefixesV2;
use crate::common::seeds::seed_prefixes_v1::SeedPrefixesV1;
use crate::common::constant::DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;
use crate::configuration_registry::configuration_registry::ConfigurationRegistry;
use crate::configuration_registry::configuration_registry_v2::ConfigurationRegistryV2;
use crate::deny_list_registry::deny_list_registry::DenyListRegistry;
use crate::deny_list_registry::deny_list_registry_v2::DenyListRegistryV2;
use crate::state::program_state::ProgramStateAccount;

#[derive(Accounts)]
pub struct MigrateV1ToV2<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixesV1::ConfigurationRegistry.as_bytes()],
        bump,
        close = admin
    )]
    pub configuration_registry_old: Account<'info, ConfigurationRegistry>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + ConfigurationRegistryV2::INIT_SPACE,
        seeds = [SeedPrefixesV2::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistryV2>,
    #[account(
        mut,
        seeds = [SeedPrefixesV1::ProgramState.as_bytes()],
        bump,
        close = admin
    )]
    pub program_state_old: Account<'info, ProgramStateAccount>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + ProgramStateAccount::INIT_SPACE,
        seeds = [SeedPrefixesV2::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + DenyListRegistry::INIT_SPACE,
        seeds = [SeedPrefixesV1::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry_old: Account<'info, DenyListRegistry>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + DenyListRegistryV2::INIT_SPACE,
        seeds = [SeedPrefixesV2::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistryV2>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

impl<'info> MigrateV1ToV2<'info> {
    pub fn process(&mut self) -> Result<()> {
        // Authentication and authorization
        self.program_state.assert_admin(&self.admin)?;
        Ok(())
    }
}