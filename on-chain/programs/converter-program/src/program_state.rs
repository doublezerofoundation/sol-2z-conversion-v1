use anchor_lang::prelude::*;
use crate::common::error::DoubleZeroError;

#[account]
#[derive(InitSpace, Debug)]
pub struct ProgramStateAccount {
    pub admin: Pubkey,
    pub fills_registry_address: Pubkey,
    pub is_halted: bool,  // Indicates whether the system accepts conversion requests
    pub bump_registry: BumpRegistry,
    pub last_trade_slot: u64,
    pub deny_list_authority: Pubkey,
}

#[derive(Debug, AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct BumpRegistry {
    pub configuration_registry_bump: u8,
    pub program_state_bump: u8,
    pub deny_list_registry_bump: u8,
    pub withdraw_authority_bump: u8,
}

impl ProgramStateAccount {
    pub fn assert_admin(&self, signer: &Signer) -> Result<()> {
        require_keys_eq!(self.admin, signer.key(), DoubleZeroError::UnauthorizedAdmin);
        Ok(())
    }
    pub fn assert_deny_list_authority(&self, signer: &Signer) -> Result<()> {
        require_keys_eq!(self.deny_list_authority, signer.key(), DoubleZeroError::UnauthorizedDenyListAuthority);
        Ok(())
    }
}
