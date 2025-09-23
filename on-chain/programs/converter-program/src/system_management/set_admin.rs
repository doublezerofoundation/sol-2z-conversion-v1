use anchor_lang::prelude::*;
use crate::{
    common::{
        seeds,
        events::system::AdminChanged
    },
    program::ConverterProgram,
    program_state::ProgramStateAccount,
};

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [seeds::PROGRAM_STATE],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    pub program: Program<'info, ConverterProgram>,
    // Current upgrade authority has to sign this instruction
    #[account(
        // Panics if program data is not legitimate.
        address = program.programdata_address()?.unwrap(),
        constraint = program_data.upgrade_authority_address == Some(admin.key()))
    ]
    pub program_data: Account<'info, ProgramData>,
}

impl<'info> SetAdmin<'info> {
    pub fn process(&mut self, new_admin: Pubkey) -> Result<()> {
        self.program_state.admin = new_admin;
        emit!(AdminChanged {
            new_admin: self.program_state.admin,
            changed_by: self.admin.key()
        });
        Ok(())
    }
}