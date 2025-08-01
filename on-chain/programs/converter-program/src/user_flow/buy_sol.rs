use anchor_lang::prelude::*;
use crate::{
    common::{
        events::init::SystemInitialized,
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        utils::attestation_utils::verify_attestation
    },
    state::program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    deny_list_registry::deny_list_registry::DenyListRegistry
};

#[derive(Accounts)]
pub struct BuySol<'info> {
    #[account(
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
    pub signer: Signer<'info>
}

impl<'info> BuySol<'info> {
    pub fn process(
        &mut self,
        bid_price: u64,
        swap_rate: String,
        timestamp: i64,
        attestation: String
    ) -> Result<()> {

        // Checking whether address is inside the deny list
        let signer_key = self.signer.key;
        require!(
            !self.deny_list_registry.denied_addresses.contains(signer_key),
            DoubleZeroError::UserInsideDenyList
        );

        // checking attestation
        verify_attestation(
            swap_rate,
            timestamp,
            attestation,
            self.configuration_registry.oracle_pubkey,
            self.configuration_registry.price_maximum_age
        )?;


        msg!("System is Initialized");
        emit!(SystemInitialized {});
        Ok(())

    }
}