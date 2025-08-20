use crate::{
    state::program_state::ProgramStateAccount,
    common::{
        constant::MAX_DENY_LIST_SIZE,
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
    }
};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct DenyListRegistry {
    #[max_len(MAX_DENY_LIST_SIZE)]
    pub denied_addresses: Vec<Pubkey>,
    pub last_updated: i64,
    pub update_count: u64, // For audit purposes
}

#[derive(Accounts)]
pub struct UpdateDenyList<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump = program_state.bump_registry.deny_list_registry_bump,
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,
    // Program state, to verify admin
    #[account(
        seeds = [SeedPrefixes::ProgramState.as_bytes()],
        bump = program_state.bump_registry.program_state_bump,
    )]
    pub program_state: Account<'info, ProgramStateAccount>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

impl<'info> UpdateDenyList<'info> {
    pub fn add_to_deny_list(&mut self, address: Pubkey) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_deny_list_authority(&self.admin)?;

        if self.deny_list_registry.denied_addresses.contains(&address) {
            return err!(DoubleZeroError::AlreadyExistsInDenyList);
        }

        if self.deny_list_registry.denied_addresses.len() >= MAX_DENY_LIST_SIZE as usize {
            return err!(DoubleZeroError::DenyListFull);
        }

        self.deny_list_registry.denied_addresses.push(address);
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        Ok(())
    }

    pub fn remove_from_deny_list(&mut self, address: Pubkey) -> Result<()> {
        // Ensure only admin can modify
        self.program_state.assert_deny_list_authority(&self.admin)?;

        if !self.deny_list_registry.denied_addresses.contains(&address) {
            return err!(DoubleZeroError::AddressNotInDenyList);
        }

        let position = self
            .deny_list_registry
            .denied_addresses
            .iter()
            .position(|&x| x == address)
            .ok_or(ErrorCode::ConstraintRaw)?;

        self.deny_list_registry.denied_addresses.remove(position);
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        Ok(())
    }
}
