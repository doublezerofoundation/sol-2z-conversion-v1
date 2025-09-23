use anchor_lang::prelude::*;
use crate::{
    program_state::ProgramStateAccount,
    configuration_registry::configuration_registry::ConfigurationRegistry,
    common::{
        seeds,
        events::fill_consumer::*,
        error::DoubleZeroError
    },
};

/// Only the admin can call this
#[derive(Accounts)]
pub struct SetFillsConsumer<'info> {
    #[account(
        mut,
        seeds = [seeds::CONFIGURATION_REGISTRY],
        bump = program_state.bump_registry.configuration_registry_bump
    )]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,
    #[account(
        seeds = [seeds::PROGRAM_STATE],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    pub admin: Signer<'info>,
}

impl<'info> SetFillsConsumer<'info> {
    pub fn set_fills_consumer(&mut self, new_consumer: Pubkey) -> Result<()> {
        // Ensure only admin can modify
        require_keys_eq!(
            self.admin.key(), 
            self.program_state.admin, 
            DoubleZeroError::UnauthorizedAdmin
        );
        self.configuration_registry.fills_consumer = new_consumer;
        emit!(FillsConsumerChanged {
            changed_by: self.admin.key(),
            new_consumer,
        });
        Ok(())
    }
}