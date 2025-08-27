use anchor_lang::prelude::*;
use crate::{
    common::seeds::seed_prefixes::SeedPrefixes,
    program::ConverterProgram,
    program_state::ProgramStateAccount
};

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
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
        Ok(())
    }
}