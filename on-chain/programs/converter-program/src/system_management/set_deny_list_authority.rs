use crate::common::seeds::seed_prefixes::SeedPrefixes;
use anchor_lang::prelude::*;
use crate::program_state::ProgramStateAccount;
use crate::program::ConverterProgram;

#[derive(Accounts)]
pub struct SetDenyListAuthority<'info> {
    #[account(mut)]
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

impl<'info> SetDenyListAuthority<'info> {
    pub fn process(&mut self, new_authority: Pubkey) -> Result<()> {
        self.program_state.deny_list_authority = new_authority;
        Ok(())
    }
}