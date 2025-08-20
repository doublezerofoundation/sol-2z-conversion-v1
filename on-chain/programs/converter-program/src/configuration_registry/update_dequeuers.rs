use anchor_lang::prelude::*;
use crate::{
    program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    common::{
        seeds::seed_prefixes::SeedPrefixes,
        events::dequeuer::*,
        constant::MAX_AUTHORIZED_DEQUEUERS,
        error::DoubleZeroError
    }
};

/// Only the admin can call this
#[derive(Accounts)]
pub struct UpdateDequeuers<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::ConfigurationRegistry.as_bytes()],
        bump = program_state.bump_registry.configuration_registry_bump
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,  
    // Program state, to verify admin
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    pub admin: Signer<'info>,
}

impl<'info> UpdateDequeuers<'info> {

    pub fn add_dequeuer(
        &mut self,
        new_pubkey: Pubkey,
    ) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_admin(&self.admin)?;

        if !self.configuration_registry.authorized_dequeuers.contains(&new_pubkey) {
            // Enforce the maximum limit
            let authorized_dequeuers_length = self.configuration_registry.authorized_dequeuers.len() as u64;
            require!(
                authorized_dequeuers_length < MAX_AUTHORIZED_DEQUEUERS,
                DoubleZeroError::MaxAuthorizedDequeuersReached
            );
            self.configuration_registry.authorized_dequeuers.push(new_pubkey);

            emit!(DequeuerAdded {
                added_by: self.admin.key(),
                dequeuer: new_pubkey,
            });
        }
        Ok(())
    }

    pub fn remove_dequeuer(&mut self, remove_pubkey: Pubkey) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_admin(&self.admin)?;

        let dequeuers = &mut self.configuration_registry.authorized_dequeuers;
        let before_len = dequeuers.len();
        dequeuers.retain(|pk| pk != &remove_pubkey);

        if dequeuers.len() != before_len {
            emit!(DequeuerRemoved {
                removed_by: self.admin.key(),
                dequeuer: remove_pubkey,
            });
        }
        Ok(())
    }
}