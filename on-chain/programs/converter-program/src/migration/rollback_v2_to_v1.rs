use crate::common::seeds::seed_prefixes_v2::SeedPrefixesV2;
use crate::common::seeds::seed_prefixes_v1::SeedPrefixesV1;
use crate::common::constant::DISCRIMINATOR_SIZE;
use anchor_lang::prelude::*;
use crate::configuration_registry::configuration_registry::ConfigurationRegistry;
use crate::deny_list_registry::DenyListRegistry;
use crate::migration::sample_configuration_registry_v2::ConfigurationRegistryV2;
use crate::migration::sample_deny_list_registry_v2::DenyListRegistryV2;
use crate::program_state::ProgramStateAccount;

#[derive(Accounts)]
pub struct RollbackV2toV1<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixesV2::ConfigurationRegistry.as_bytes()],
        bump,
        close = admin
    )]
    pub configuration_registry_old: Account<'info, ConfigurationRegistryV2>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + ConfigurationRegistry::INIT_SPACE,
        seeds = [SeedPrefixesV1::ConfigurationRegistry.as_bytes()],
        bump,
    )]
    pub configuration_registry_new: Account<'info, ConfigurationRegistry>,
    #[account(
        mut,
        seeds = [SeedPrefixesV1::ProgramState.as_bytes()],
        bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(
        mut,
        seeds = [SeedPrefixesV2::DenyListRegistry.as_bytes()],
        bump,
        close = admin
    )]
    pub deny_list_registry_old: Account<'info, DenyListRegistryV2>,
    #[account(
        init,
        payer = admin,
        space = DISCRIMINATOR_SIZE + DenyListRegistry::INIT_SPACE,
        seeds = [SeedPrefixesV1::DenyListRegistry.as_bytes()],
        bump,
    )]
    pub deny_list_registry_new: Account<'info, DenyListRegistry>,
    pub system_program: Program<'info, System>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

impl<'info> RollbackV2toV1<'info> {
    pub fn process(&mut self) -> Result<()> {
        // Authentication and authorization
        self.program_state.assert_admin(&self.admin)?;

        // migration of configuration registry

        // Copy existing data
        self.configuration_registry_new.price_maximum_age = self.configuration_registry_old.price_maximum_age;
        self.configuration_registry_new.fills_consumer = self.configuration_registry_old.fill_consumer;
        self.configuration_registry_new.coefficient = self.configuration_registry_old.coefficient;
        self.configuration_registry_new.max_discount_rate = self.configuration_registry_old.max_discount_rate;
        self.configuration_registry_new.min_discount_rate = self.configuration_registry_old.min_discount_rate;

        // doing the changes for replacement/ removal
        self.configuration_registry_new.oracle_pubkey = self.configuration_registry_old.price_oracle_pubkey;
        self.configuration_registry_new.sol_quantity = self.configuration_registry_old.sol_amount;

        // migration of denylist registry
        self.deny_list_registry_new.denied_addresses = self.deny_list_registry_old.denied_addresses.clone();
        self.deny_list_registry_new.last_updated = self.deny_list_registry_old.last_updated;
        self.deny_list_registry_new.update_count = self.deny_list_registry_old.update_count;
        // discard the new field

        Ok(())
    }
    
    pub fn set_bumps(
        &mut self,
        configuration_registry_bump: u8,
        deny_list_registry_bump: u8,
    )-> Result<()> {
        let bump_registry = &mut self.program_state.bump_registry;
        bump_registry.configuration_registry_bump = configuration_registry_bump;
        bump_registry.deny_list_registry_bump = deny_list_registry_bump;
        Ok(())
    }
}