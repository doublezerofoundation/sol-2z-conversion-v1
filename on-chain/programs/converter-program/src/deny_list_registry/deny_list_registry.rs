use crate::common::{constant::MAX_DENY_LIST_SIZE, seeds::seed_prefixes::SeedPrefixes};
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
pub struct AddToDenyList<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RemoveFromDenyList<'info> {
    #[account(
        mut,
        seeds = [SeedPrefixes::DenyListRegistry.as_bytes()],
        bump
    )]
    pub deny_list_registry: Account<'info, DenyListRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

impl<'info> AddToDenyList<'info> {
    pub fn process(&mut self, address: Pubkey) -> Result<()> {
        if self.deny_list_registry.denied_addresses.contains(&address) {
            return Err(anchor_lang::error::ErrorCode::ConstraintRaw.into());
        }

        if self.deny_list_registry.denied_addresses.len() >= MAX_DENY_LIST_SIZE as usize {
            return Err(DenyListRegistryError::DenyListFull.into());
        }

        self.deny_list_registry.denied_addresses.push(address);
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        Ok(())
    }
}

impl<'info> RemoveFromDenyList<'info> {
    pub fn process(&mut self, address: Pubkey) -> Result<()> {
        let position = self
            .deny_list_registry
            .denied_addresses
            .iter()
            .position(|&x| x == address)
            .ok_or(anchor_lang::error::ErrorCode::ConstraintRaw)?;

        self.deny_list_registry.denied_addresses.remove(position);
        self.deny_list_registry.last_updated = Clock::get()?.unix_timestamp;
        self.deny_list_registry.update_count += 1;

        Ok(())
    }
}

#[error_code]
pub enum DenyListRegistryError {
    #[msg("Deny list is full")]
    DenyListFull,
}
