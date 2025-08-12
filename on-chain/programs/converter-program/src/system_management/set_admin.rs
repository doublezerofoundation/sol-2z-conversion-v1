use anchor_lang::prelude::*;

use crate::{common::seeds::seed_prefixes::SeedPrefixes, program::ConverterProgram, state::program_state::ProgramStateAccount};

#[derive(Accounts)]
pub struct SetAdmin<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,

    // Validates that the program data account is the same as the program data account in the program
    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, ConverterProgram>,

    // Current upgrade authority has to sign this instruction
    #[account(constraint = program_data.upgrade_authority_address == Some(admin.key()))]
    pub program_data: Account<'info, ProgramData>,
}

impl<'info> SetAdmin<'info> {
    pub fn process(&mut self, new_admin: Pubkey) -> Result<()> {
        self.program_state.admin = new_admin;
        Ok(())
    }
}