
use anchor_lang::prelude::*;
use crate::state::program_state::ProgramStateAccount;
use crate::configuration_registry::configuration_registry::ConfigurationRegistry;
use crate::common::events::dequeuer::*;
use crate::common::constant::MAX_AUTHORIZED_DEQUEUERS;
use crate::common::errors::ConverterError;


/// Only the current upgrade authority can call this
#[derive(Accounts)]
pub struct UpdateDequeuers<'info> {
    #[account(mut)]
    pub configuration_registry: Account<'info, ConfigurationRegistry>,  
    // Program state, to verify admin
    #[account(mut)]
    pub program_state: Account<'info, ProgramStateAccount>,
    pub authority: Signer<'info>,
}


impl<'info> UpdateDequeuers<'info> {


    pub fn add_dequeuer(
        &mut self,
        new_pubkey: Pubkey,
    ) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_admin(&self.authority)?;

        // Enforce the maximum limit
        if self.configuration_registry.authorized_dequeuers.len() as u64 >= MAX_AUTHORIZED_DEQUEUERS {
            return Err(error!(ConverterError::MaxAuthorizedDequeuersReached));
        }

        if self.configuration_registry.add_dequeuer(new_pubkey)? {
            emit!(DequeuerAdded {
                added_by: self.authority.key(),
                dequeuer: new_pubkey,
            });
        }

        Ok(())
    }

    pub fn remove_dequeuer(&mut self, remove_pubkey: Pubkey) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_admin(&self.authority)?;
        if self.configuration_registry.remove_dequeuer(remove_pubkey)? {
            emit!(DequeuerRemoved {
                removed_by: self.authority.key(),
                dequeuer: remove_pubkey,
            });
        }

        Ok(())
    }
}