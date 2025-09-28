use anchor_lang::prelude::*;

use crate::{
    common::{
        error::DoubleZeroError,
        events::system::{SystemHalted, SystemUnhalted},
        seeds,
    },
    program_state::ProgramStateAccount,
};

#[derive(Accounts)]
pub struct SystemState<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [seeds::PROGRAM_STATE],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
}

impl<'info> SystemState<'info> {
    pub fn process(&mut self, set_to: bool) -> Result<()> {
        // Authentication check
        require_keys_eq!(
            self.admin.key(), 
            self.program_state.admin, 
            DoubleZeroError::UnauthorizedAdmin
        );

        // Update system state
        if set_to && !self.program_state.is_halted {
            self.program_state.is_halted = true;
            emit!(SystemHalted {
                halted_by: self.admin.key()
            });
        } else if !set_to && self.program_state.is_halted {
            self.program_state.is_halted = false;
            emit!(SystemUnhalted {
                unhalted_by: self.admin.key()
            });
        } else {
            return err!(DoubleZeroError::InvalidSystemState);
        }
        Ok(())
    }
}