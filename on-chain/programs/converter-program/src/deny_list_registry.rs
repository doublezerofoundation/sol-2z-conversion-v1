use crate::{
    program_state::ProgramStateAccount,
    common::{
        constant::MAX_DENY_LIST_SIZE,
        seeds::seed_prefixes::SeedPrefixes,
        error::DoubleZeroError,
        events::deny_list::{DenyListAddressAdded, DenyListAddressRemoved},
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
    pub admin: Signer<'info>,
}

impl<'info> UpdateDenyList<'info> {
    pub fn add_to_deny_list(&mut self, address: Pubkey) -> Result<()> {
        // Ensure only deny list authority can modify.
        require_keys_eq!(
            self.admin.key(),
            self.program_state.deny_list_authority,
            DoubleZeroError::UnauthorizedDenyListAuthority
        );

        require!(
            !self.deny_list_registry.denied_addresses.contains(&address),
            DoubleZeroError::AlreadyExistsInDenyList
        );

        require!(
            self.deny_list_registry.denied_addresses.len() < MAX_DENY_LIST_SIZE as usize,
            DoubleZeroError::DenyListFull
        );

        self.deny_list_registry.denied_addresses.push(address);
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        // Emit event
        emit!(DenyListAddressAdded {
            added_by: self.admin.key(),
            address,
            timestamp: self.deny_list_registry.last_updated,
            update_count: self.deny_list_registry.update_count,
        });

        Ok(())
    }

    pub fn remove_from_deny_list(&mut self, address: Pubkey) -> Result<()> {
        // Ensure only deny list authority can modify.
        require_keys_eq!(
            self.admin.key(),
            self.program_state.deny_list_authority,
            DoubleZeroError::UnauthorizedDenyListAuthority
        );

        if let Some(pos) = self.deny_list_registry.denied_addresses
            .iter()
            .position(|&x| x == address) {
            self.deny_list_registry.denied_addresses.remove(pos);
        } else {
            return err!(DoubleZeroError::AddressNotInDenyList);
        }
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        // Emit event
        emit!(DenyListAddressRemoved {
            removed_by: self.admin.key(),
            address,
            timestamp: self.deny_list_registry.last_updated,
            update_count: self.deny_list_registry.update_count,
        });

        Ok(())
    }
}